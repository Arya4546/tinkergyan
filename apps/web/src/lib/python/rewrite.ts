/**
 * rewrite.ts — small source changes that let the browser's MicroPython run
 * Python it otherwise can't, before the program starts. Each change stays on
 * its own line, so error messages still point at the student's line numbers.
 *
 *   s[::-1]      → _tg_slice(s, None, None, -1)
 *       MicroPython slices text and tuples only with step 1; _tg_slice (set up
 *       in the worker's PRELUDE) does the rest. Lists already work, and assigning
 *       to a slice (a[::2] = …) is left alone.
 *   @dataclass   → @dataclass(_tg_fields=('x', 'y'))
 *       MicroPython forgets `x: int` in a class body, so compat/dataclasses.py
 *       is told the field names, in order.
 *
 * Code the parser can't read is returned unchanged: running it reports the
 * syntax error exactly as before. Imports only the parser: the Node test
 * harness loads this file directly.
 */
import { pythonLanguage } from '@codemirror/lang-python';

type SyntaxNode = ReturnType<typeof pythonLanguage.parser.parse>['topNode'];

interface Edit {
  from: number;
  to: number;
  text: string;
}

/** Is this a one-line subscript with a step (two colons and a step value)? */
function isStepSlice(n: SyntaxNode, code: string): boolean {
  if (code.slice(n.from, n.to).includes('\n')) return false; // keep line numbers
  const kids: SyntaxNode[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) kids.push(c);
  const open = kids.findIndex((k) => k.name === '[');
  if (open < 1 || kids[kids.length - 1]!.name !== ']') return false;
  const inside = kids.slice(open + 1, -1);
  if (inside.some((k) => k.name === ',')) return false; // a[1:2, ::2]
  const colons = inside.filter((k) => k.name === ':');
  // s[a:b:] has no step: nothing to do.
  return colons.length === 2 && inside[inside.length - 1]!.name !== ':';
}

/** Is this subscript being assigned to or deleted (a[::2] = …, del a[::2])? */
function isTarget(n: SyntaxNode): boolean {
  const p = n.parent;
  if (!p) return false;
  if (p.name === 'DeleteStatement') return true;
  if (p.name === 'AssignStatement' || p.name === 'UpdateStatement') {
    // Targets come before the (last) assignment operator.
    let op: SyntaxNode | null = null;
    for (let c = p.lastChild; c; c = c.prevSibling) {
      if (c.name === 'AssignOp' || c.name === 'UpdateOp') {
        op = c;
        break;
      }
    }
    return !!op && n.to <= op.from;
  }
  // a, b[::2] = …
  if (p.name === 'TupleExpression' || p.name === 'ArrayExpression') return isTarget(p);
  return false;
}

/** Names of the fields in a @dataclass body (annotated, not ClassVar). */
function dataclassFields(cls: SyntaxNode, code: string): string[] {
  const body = cls.getChild('Body');
  const names: string[] = [];
  for (let c = body?.firstChild ?? null; c; c = c.nextSibling) {
    if (c.name !== 'AssignStatement') continue;
    const name = c.firstChild;
    const typeDef = name?.nextSibling;
    if (name?.name !== 'VariableName' || typeDef?.name !== 'TypeDef') continue;
    const type = code.slice(typeDef.from + 1, typeDef.to).trim();
    if (/^(typing\.)?ClassVar\b/.test(type)) continue;
    names.push(code.slice(name.from, name.to));
  }
  return names;
}

function dataclassEdit(stmt: SyntaxNode, code: string): Edit | null {
  const cls = stmt.getChild('ClassDefinition');
  if (!cls) return null;
  for (const dec of stmt.getChildren('Decorator')) {
    const text = code.slice(dec.from, dec.to).trimEnd();
    const m = /^@\s*((?:dataclasses\s*\.\s*)?dataclass)\s*(\(([\s\S]*)\))?$/.exec(text);
    if (!m) continue;
    // Only when it fits on one line, so line numbers can't move.
    if (text.includes('\n')) return null;
    const fields = dataclassFields(cls, code);
    const list = `_tg_fields=(${fields.map((f) => `'${f}'`).join(', ')}${fields.length === 1 ? ',' : ''})`;
    const args = m[3]?.trim();
    const call = args ? `${m[1]}(${args.replace(/,\s*$/, '')}, ${list})` : `${m[1]}(${list})`;
    return { from: dec.from, to: dec.from + text.length, text: `@${call}` };
  }
  return null;
}

/** `seq[a:b:c] = value` or `del seq[a:b:c]` alone: the subscript, or null. */
function stepSliceStatement(stmt: SyntaxNode, code: string): SyntaxNode | null {
  const kids: SyntaxNode[] = [];
  for (let c = stmt.firstChild; c; c = c.nextSibling) kids.push(c);
  if (stmt.name === 'DeleteStatement') {
    return kids.length === 2 && kids[1]!.name === 'MemberExpression' && isStepSlice(kids[1]!, code)
      ? kids[1]!
      : null;
  }
  if (
    stmt.name === 'AssignStatement' &&
    kids.length === 3 &&
    kids[0]!.name === 'MemberExpression' &&
    kids[1]!.name === 'AssignOp' &&
    code.slice(kids[1]!.from, kids[1]!.to) === '=' &&
    isStepSlice(kids[0]!, code)
  ) {
    return kids[0]!;
  }
  return null;
}

export function rewriteForEngine(code: string): string {
  // Cheap check first: most programs need nothing.
  if (!/:[^:\n]*:|dataclass/.test(code)) return code;
  let tree;
  try {
    tree = pythonLanguage.parser.parse(code);
  } catch {
    return code;
  }
  let bad = false;
  tree.iterate({
    enter: (n) => {
      if (n.type.isError) bad = true;
      return !bad;
    },
  });
  if (bad) return code;
  const edits: Edit[] = [];
  // Rewrite innermost first: s[::-1][::2] needs both, nested in each other.
  const rewrite = (from: number, to: number): string => {
    let out = '';
    let pos = from;
    for (const e of edits.filter((e) => e.from >= from && e.to <= to)) {
      out += code.slice(pos, e.from) + e.text;
      pos = e.to;
    }
    return out + code.slice(pos, to);
  };
  tree.iterate({
    enter: () => {},
    leave: (ref) => {
      const n = ref.node;
      if (n.name === 'MemberExpression' && !isTarget(n) && isStepSlice(n, code)) {
        const kids: SyntaxNode[] = [];
        for (let c = n.firstChild; c; c = c.nextSibling) kids.push(c);
        const open = kids.findIndex((k) => k.name === '[');
        const piece = (from: number, to: number) => rewrite(from, to).trim() || 'None';
        // Re-read the parts with nested rewrites applied.
        const inside = kids.slice(open + 1, -1);
        const values: string[] = ['None', 'None', 'None'];
        let part = 0;
        for (const k of inside) {
          if (k.name === ':') part++;
          else values[part] = piece(k.from, k.to);
        }
        const target = rewrite(n.from, kids[open]!.from);
        const text = `_tg_slice(${target}, ${values[0]}, ${values[1]}, ${values[2]})`;
        // The nested edits are now inside this one.
        for (let i = edits.length - 1; i >= 0; i--) {
          if (edits[i]!.from >= n.from && edits[i]!.to <= n.to) edits.splice(i, 1);
        }
        edits.push({ from: n.from, to: n.to, text });
      } else if (n.name === 'AssignStatement' || n.name === 'DeleteStatement') {
        // MicroPython can't assign to or delete a step slice even of a list.
        const target = stepSliceStatement(n, code);
        if (!target) return;
        const kids: SyntaxNode[] = [];
        for (let c = target.firstChild; c; c = c.nextSibling) kids.push(c);
        const open = kids.findIndex((k) => k.name === '[');
        const values: string[] = ['None', 'None', 'None'];
        let part = 0;
        for (const k of kids.slice(open + 1, -1)) {
          if (k.name === ':') part++;
          else values[part] = rewrite(k.from, k.to);
        }
        const seq = rewrite(target.from, kids[open]!.from);
        const args = `${seq}, ${values[0]}, ${values[1]}, ${values[2]}`;
        const text =
          n.name === 'DeleteStatement'
            ? `_tg_delslice(${args})`
            : `_tg_setslice(${args}, ${rewrite(n.lastChild!.from, n.to)})`;
        for (let i = edits.length - 1; i >= 0; i--) {
          if (edits[i]!.from >= n.from && edits[i]!.to <= n.to) edits.splice(i, 1);
        }
        edits.push({ from: n.from, to: n.to, text });
      } else if (n.name === 'DecoratedStatement') {
        const e = dataclassEdit(n, code);
        // Not over another edit (a slice inside the decorator's arguments).
        if (e && !edits.some((o) => o.from < e.to && o.to > e.from)) edits.push(e);
      }
    },
  });
  if (!edits.length) return code;
  edits.sort((a, b) => a.from - b.from);
  return rewrite(0, code.length);
}
