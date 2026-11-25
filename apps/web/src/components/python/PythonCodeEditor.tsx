/**
 * PythonCodeEditor.tsx — the text editor for Python projects (CodeMirror 6).
 *
 * CodeMirror rather than Monaco (which the C++ editor uses): it is bundled
 * with the app (no CDN download that school networks may block), about a
 * tenth of the size, and works with phone and tablet on-screen keyboards,
 * which Monaco does not support.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state';
import { Decoration, type DecorationSet, keymap } from '@codemirror/view';
import { indentWithTab, undo, redo } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { paletteFor } from '../../lib/editor-tokens';

export interface PythonCodeEditorHandle {
  getValue: () => string;
  /** Insert text at the cursor (used by the phone symbol bar). */
  insert: (text: string) => void;
  /** Scroll to a line and put the cursor on it. */
  goToLine: (line: number) => void;
  focus: () => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  fontSize?: number;
  dark: boolean;
  /** 1-based line to highlight as the error, or null. */
  errorLine?: number | null;
  className?: string;
  ariaLabel?: string;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
}

// ── Error-line highlight ────────────────────────────────────────────────────
const setErrorLine = StateEffect.define<number | null>();
const errorLineMark = Decoration.line({ class: 'cm-tg-error-line' });
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      const line = e.value;
      if (line === null || line < 1 || line > tr.state.doc.lines) deco = Decoration.none;
      else deco = Decoration.set([errorLineMark.range(tr.state.doc.line(line).from)]);
    }
    // Editing the code makes the old error position meaningless.
    if (tr.docChanged) deco = Decoration.none;
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function themeFor(dark: boolean, fontSize: number): Extension {
  const p = paletteFor(dark ? 'dark' : 'light');
  return EditorView.theme(
    {
      '&': { height: '100%', fontSize: `${fontSize}px`, backgroundColor: p.well, color: p.textHi },
      '.cm-scroller': {
        fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Menlo, Consolas, monospace',
        lineHeight: '1.6',
      },
      '.cm-content': { caretColor: p.accent, padding: '12px 0' },
      '.cm-gutters': { backgroundColor: p.well, color: p.textLo, border: 'none' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: p.textMid },
      '.cm-activeLine': { backgroundColor: p.lineSoft },
      '&.cm-focused': { outline: 'none' },
      '&.cm-focused .cm-cursor': { borderLeftColor: p.accent, borderLeftWidth: '2px' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: dark ? 'rgba(129,140,248,0.35)' : 'rgba(99,102,241,0.22)',
      },
      '.cm-tooltip': { backgroundColor: p.panel, border: `1px solid ${p.line}`, color: p.textHi },
      '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: p.accent, color: '#fff' },
      '.cm-tg-error-line': {
        backgroundColor: dark ? 'rgba(248,113,113,0.18)' : 'rgba(239,68,68,0.12)',
      },
    },
    { dark },
  );
}

export const PythonCodeEditor = forwardRef<PythonCodeEditorHandle, Props>(
  (
    {
      value,
      onChange,
      readOnly = false,
      fontSize = 15,
      dark,
      errorLine = null,
      className = '',
      ariaLabel,
      wrap = false,
    },
    ref,
  ) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const themeComp = useRef(new Compartment());
    const readOnlyComp = useRef(new Compartment());

    // Create the editor once.
    useEffect(() => {
      if (!hostRef.current) return;
      const view = new EditorView({
        parent: hostRef.current,
        state: EditorState.create({
          doc: value,
          extensions: [
            basicSetup,
            python(),
            indentUnit.of('    '),
            EditorState.tabSize.of(4),
            keymap.of([indentWithTab]),
            errorLineField,
            ...(wrap ? [EditorView.lineWrapping] : []),
            themeComp.current.of(themeFor(dark, fontSize)),
            readOnlyComp.current.of([
              EditorState.readOnly.of(readOnly),
              EditorView.editable.of(!readOnly),
            ]),
            EditorView.contentAttributes.of({
              'aria-label': ariaLabel ?? 'Python code',
              autocapitalize: 'off',
              autocorrect: 'off',
              spellcheck: 'false',
            }),
            EditorView.updateListener.of((u) => {
              if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
            }),
          ],
        }),
      });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; props sync below
    }, []);

    // Keep the document in sync when the value changes from outside (an
    // example loaded, blocks converted). Typing goes the other way via onChange
    // and leaves the two equal, so this never fights the cursor.
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current !== value) {
        view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
      }
    }, [value]);

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: themeComp.current.reconfigure(themeFor(dark, fontSize)),
      });
    }, [dark, fontSize]);

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: readOnlyComp.current.reconfigure([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
      });
    }, [readOnly]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: setErrorLine.of(errorLine) });
    }, [errorLine]);

    useImperativeHandle(ref, () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? value,
      insert(text: string) {
        const view = viewRef.current;
        if (!view || readOnly) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
          scrollIntoView: true,
        });
        view.focus();
      },
      goToLine(line: number) {
        const view = viewRef.current;
        if (!view) return;
        const n = Math.min(Math.max(1, line), view.state.doc.lines);
        const pos = view.state.doc.line(n).from;
        view.dispatch({
          selection: { anchor: pos },
          effects: EditorView.scrollIntoView(pos, { y: 'center' }),
        });
        // Re-apply the highlight: moving the cursor does not change the doc.
        view.dispatch({ effects: setErrorLine.of(errorLine) });
        view.focus();
      },
      focus: () => viewRef.current?.focus(),
      undo: () => {
        if (viewRef.current) undo(viewRef.current);
      },
      redo: () => {
        if (viewRef.current) redo(viewRef.current);
      },
    }));

    return <div ref={hostRef} className={`h-full w-full overflow-hidden ${className}`} />;
  },
);

PythonCodeEditor.displayName = 'PythonCodeEditor';
