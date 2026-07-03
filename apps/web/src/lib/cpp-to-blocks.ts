/**
 * cpp-to-blocks.ts
 *
 * A recursive-descent parser that translates a restricted subset of Arduino C++
 * into a valid Blockly XML workspace string.
 *
 * Supported constructs:
 *   - void setup(), void loop()
 *   - Global variable declarations
 *   - delay(ms / s), delayMicroseconds(ms)
 *   - pinMode, digitalWrite, digitalRead, analogRead, analogWrite
 *   - Serial.begin, Serial.print, Serial.println
 *   - if-else statements, while loops, for loops
 *   - Basic math and logical operations
 */

export class ParserError extends Error {
  line: number;
  col: number;

  constructor(message: string, line: number, col: number) {
    super(message);
    this.line = line;
    this.col = col;
    this.name = 'ParserError';
  }
}

export interface Token {
  type:
    | 'KEYWORD'
    | 'IDENTIFIER'
    | 'NUMBER'
    | 'STRING'
    | 'OPERATOR'
    | 'PUNCTUATION'
    | 'PREPROCESSOR'
    | 'EOF';
  value: string;
  line: number;
  col: number;
}

export interface CommentInfo {
  value: string;
  line: number;
}

interface BlockXml {
  type: string;
  mutation?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  statements?: Record<string, string>;
  rawXml?: string;
  comment?: string;
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

export function tokenize(code: string): { tokens: Token[]; comments: CommentInfo[] } {
  if (code.length > 1024 * 1024) {
    throw new ParserError('Input file size exceeds 1MB limit', 1, 1);
  }

  const tokens: Token[] = [];
  const comments: CommentInfo[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (code[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const keywords = new Set([
    'void',
    'const',
    'int',
    'float',
    'double',
    'char',
    'String',
    'bool',
    'if',
    'else',
    'while',
    'for',
    'return',
    'break',
    'continue',
    'true',
    'false',
  ]);

  while (i < code.length) {
    const char = code[i];
    if (char === undefined) break;

    if (/\s/.test(char)) {
      advance();
      continue;
    }

    if (char === '/' && code[i + 1] === '/') {
      const startLine = line;
      advance(2);
      let val = '';
      while (i < code.length && code[i] !== '\n') {
        val += code[i] || '';
        advance();
      }
      comments.push({ value: val.trim(), line: startLine });
      continue;
    }

    if (char === '/' && code[i + 1] === '*') {
      const startLine = line;
      const startCol = col;
      advance(2);
      let val = '';
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        val += code[i] || '';
        advance();
      }
      if (i >= code.length) {
        throw new ParserError('Unterminated block comment', startLine, startCol);
      }
      advance(2);
      comments.push({ value: val.trim(), line: startLine });
      continue;
    }

    if (char === '#') {
      const startLine = line;
      const startCol = col;
      let val = '';
      while (i < code.length && code[i] !== '\n') {
        val += code[i];
        advance();
      }
      tokens.push({ type: 'PREPROCESSOR', value: val, line: startLine, col: startCol });
      continue;
    }

    // Hex numbers
    if (char === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
      const startLine = line;
      const startCol = col;
      let val = '0x';
      advance(2);
      while (i < code.length && /[0-9a-fA-F]/.test(code[i] || '')) {
        val += code[i] || '';
        advance();
      }
      tokens.push({ type: 'NUMBER', value: val, line: startLine, col: startCol });
      continue;
    }

    // Binary numbers
    if (char === '0' && (code[i + 1] === 'b' || code[i + 1] === 'B')) {
      const startLine = line;
      const startCol = col;
      let val = '0b';
      advance(2);
      while (i < code.length && /[01]/.test(code[i] || '')) {
        val += code[i] || '';
        advance();
      }
      tokens.push({ type: 'NUMBER', value: val, line: startLine, col: startCol });
      continue;
    }

    // Decimal/floating/scientific numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(code[i + 1] || ''))) {
      const startLine = line;
      const startCol = col;
      let val = '';
      let hasDot = false;
      let hasExponent = false;

      while (i < code.length) {
        const current_char = code[i] || '';
        if (current_char === '.') {
          if (hasDot || hasExponent) break;
          hasDot = true;
          val += current_char;
          advance();
        } else if (/[eE]/.test(current_char)) {
          if (hasExponent) break;
          hasExponent = true;
          val += current_char;
          advance();
          if (code[i] === '+' || code[i] === '-') {
            val += code[i];
            advance();
          }
        } else if (/\d/.test(current_char)) {
          val += current_char;
          advance();
        } else if (val && /[uUlL]/.test(current_char)) {
          val += current_char;
          advance();
        } else {
          break;
        }
      }
      tokens.push({ type: 'NUMBER', value: val, line: startLine, col: startCol });
      continue;
    }

    // String literals
    if (char === '"') {
      const startLine = line;
      const startCol = col;
      let val = '';
      advance();
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') {
          val += code[i] + (code[i + 1] || '');
          advance(2);
        } else {
          val += code[i];
          advance();
        }
      }
      if (i >= code.length) {
        throw new ParserError('Unterminated string literal', startLine, startCol);
      }
      advance();
      tokens.push({ type: 'STRING', value: val, line: startLine, col: startCol });
      continue;
    }

    // Char literals
    if (char === "'") {
      const startLine = line;
      const startCol = col;
      let val = '';
      advance();
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') {
          val += code[i] + (code[i + 1] || '');
          advance(2);
        } else {
          val += code[i];
          advance();
        }
      }
      if (i >= code.length) {
        throw new ParserError('Unterminated char literal', startLine, startCol);
      }
      advance();
      tokens.push({ type: 'STRING', value: val, line: startLine, col: startCol });
      continue;
    }

    const threeChars = code.substring(i, i + 3);
    if (['<<=', '>>='].includes(threeChars)) {
      tokens.push({ type: 'OPERATOR', value: threeChars, line, col });
      advance(3);
      continue;
    }

    const twoChars = code.substring(i, i + 2);
    if (
      [
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '+=',
        '-=',
        '++',
        '--',
        '<<',
        '>>',
        '&=',
        '|=',
        '^=',
      ].includes(twoChars)
    ) {
      tokens.push({ type: 'OPERATOR', value: twoChars, line, col });
      advance(2);
      continue;
    }

    if (
      ['=', '<', '>', '+', '-', '*', '/', '%', '!', '&', '|', '^', '~', '?', ':'].includes(char)
    ) {
      tokens.push({ type: 'OPERATOR', value: char, line, col });
      advance();
      continue;
    }

    if ([';', ',', '(', ')', '{', '}', '[', ']', '.'].includes(char)) {
      tokens.push({ type: 'PUNCTUATION', value: char, line, col });
      advance();
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      const startLine = line;
      const startCol = col;
      let val = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i] || '')) {
        val += code[i] || '';
        advance();
      }
      if (keywords.has(val)) {
        tokens.push({ type: 'KEYWORD', value: val, line: startLine, col: startCol });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: val, line: startLine, col: startCol });
      }
      continue;
    }

    throw new ParserError(`Unexpected character '${char}'`, line, col);
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return { tokens, comments };
}

// ─── Parser ──────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private comments: CommentInfo[];
  private current = 0;
  public variables = new Set<string>();
  private variableTypes = new Map<string, string>();
  public calledProcedures = new Map<string, string[]>();
  public definedFunctions = new Set<string>();
  private usedComments = new Set<CommentInfo>();
  private expressionDepth = 0;

  constructor(tokens: Token[], comments: CommentInfo[] = []) {
    this.tokens = tokens;
    this.comments = comments;
  }

  private getCommentsAbove(targetLine: number): string | null {
    const commentsList: string[] = [];
    let searchLine = targetLine - 1;
    let allowedBlankLines = 1;

    while (searchLine > 0) {
      const comment = this.comments.find((c) => c.line === searchLine && !this.usedComments.has(c));
      if (comment) {
        commentsList.unshift(comment.value);
        this.usedComments.add(comment);
        searchLine--;
      } else {
        if (allowedBlankLines > 0) {
          allowedBlankLines--;
          searchLine--;
        } else {
          break;
        }
      }
    }
    return commentsList.length > 0 ? commentsList.join('\n') : null;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', line: 0, col: 0 };
  }

  private check(type: string, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private advance(): Token {
    const t = this.peek();
    if (t.type !== 'EOF') this.current++;
    return t;
  }

  private consume(type: string, value?: string, message = ''): Token {
    if (this.check(type, value)) {
      return this.advance();
    }
    const t = this.peek();
    throw new ParserError(
      `${message || `Expected token ${type}${value ? ` '${value}'` : ''}`}, found '${t.value}'`,
      t.line,
      t.col,
    );
  }

  public parse(): {
    variables: string[];
    setupCode: string;
    loopCode: string;
    functions: string[];
  } {
    let setupCode = '';
    let loopCode = '';
    const functions: string[] = [];

    while (!this.check('EOF')) {
      const t = this.peek();

      if (t.type === 'PREPROCESSOR') {
        this.advance();
        continue;
      }

      try {
        if (this.isFunctionDeclaration()) {
          const fnXml = this.parseFunction();
          if (fnXml.name === 'setup') {
            setupCode = fnXml.body;
          } else if (fnXml.name === 'loop') {
            loopCode = fnXml.body;
          } else {
            functions.push(fnXml.xml);
          }
        } else if (this.isVariableDeclaration()) {
          this.parseGlobalVariable();
        } else {
          this.advance();
        }
      } catch (e) {
        if (e instanceof ParserError) {
          this.synchronize();
        } else {
          throw e;
        }
      }
    }

    const ARDUINO_CONSTANTS = new Set([
      'HIGH',
      'LOW',
      'INPUT',
      'OUTPUT',
      'INPUT_PULLUP',
      'LED_BUILTIN',
    ]);
    const filteredVars = Array.from(this.variables).filter((v) => !ARDUINO_CONSTANTS.has(v));

    return {
      variables: filteredVars,
      setupCode,
      loopCode,
      functions,
    };
  }

  private isVariableDeclaration(): boolean {
    let temp = this.current;
    const tTemp = this.tokens[temp];
    if (tTemp && tTemp.value === 'const') temp++;

    const typeToken = this.tokens[temp];
    if (!typeToken) return false;
    if (typeToken.type !== 'KEYWORD' && typeToken.type !== 'IDENTIFIER') return false;

    temp++;
    const nameToken = this.tokens[temp];
    if (!nameToken || nameToken.type !== 'IDENTIFIER') return false;

    temp++;
    const nextToken = this.tokens[temp];
    if (
      nextToken &&
      (nextToken.value === ';' || nextToken.value === '=' || nextToken.value === ',')
    ) {
      return true;
    }
    return false;
  }

  private isFunctionDeclaration(): boolean {
    let temp = this.current;
    const tTemp = this.tokens[temp];
    if (tTemp && tTemp.value === 'const') temp++;

    const typeToken = this.tokens[temp];
    if (!typeToken) return false;
    if (typeToken.type !== 'KEYWORD' && typeToken.type !== 'IDENTIFIER') return false;

    temp++;
    const nameToken = this.tokens[temp];
    if (!nameToken || nameToken.type !== 'IDENTIFIER') return false;

    temp++;
    const nextToken = this.tokens[temp];
    if (nextToken && nextToken.value === '(') {
      return true;
    }
    return false;
  }

  private parseGlobalVariable() {
    if (this.check('KEYWORD', 'const')) {
      this.advance();
    }

    const typeToken = this.advance(); // type
    while (true) {
      const nameToken = this.consume('IDENTIFIER', undefined, 'Expected variable name');
      if (this.check('PUNCTUATION', '[')) {
        this.advance();
        if (this.check('NUMBER')) this.advance();
        this.consume('PUNCTUATION', ']');
      }
      this.variables.add(nameToken.value);
      this.variableTypes.set(nameToken.value, typeToken.value);

      if (this.check('OPERATOR', '=')) {
        this.advance();
        this.parseExpression(true);
      }

      if (this.check('PUNCTUATION', ',')) {
        this.advance();
      } else {
        break;
      }
    }
    this.consume('PUNCTUATION', ';', 'Expected semicolon after variable declaration');
  }

  private parseFunction(): { name: string; body: string; xml: string } {
    const startToken = this.peek();
    const typeToken = this.advance();
    const nameToken = this.consume('IDENTIFIER', undefined, 'Expected function name');
    this.consume('PUNCTUATION', '(');

    const args: string[] = [];
    while (!this.check('PUNCTUATION', ')')) {
      const argType = this.advance(); // arg type
      const argName = this.consume('IDENTIFIER', undefined, 'Expected argument name');
      args.push(argName.value);
      this.variables.add(argName.value);
      this.variableTypes.set(argName.value, argType.value);
      if (this.check('PUNCTUATION', ',')) this.advance();
    }
    this.consume('PUNCTUATION', ')');

    this.consume('PUNCTUATION', '{');
    const bodyBlocks = this.parseStatements();
    this.consume('PUNCTUATION', '}');

    const bodyXml = this.statementsToXml(bodyBlocks);
    this.definedFunctions.add(nameToken.value);

    let xml = '';
    const isNoReturn = typeToken.value === 'void';
    if (nameToken.value !== 'setup' && nameToken.value !== 'loop') {
      const type = isNoReturn ? 'procedures_defnoreturn' : 'procedures_defreturn';
      const commentText = this.getCommentsAbove(startToken.line);
      const commentXml = commentText
        ? `<comment pinned="false" h="80" w="160">${escapeXml(commentText)}</comment>`
        : '';
      xml = `<block type="${type}">
        <field name="NAME">${escapeXml(nameToken.value)}</field>
        ${commentXml}
        <mutation>
          ${args.map((arg) => `<arg name="${escapeXml(arg)}"></arg>`).join('')}
        </mutation>
        <statement name="STACK">
          ${bodyXml}
        </statement>
      </block>`;
    }

    return {
      name: nameToken.value,
      body: bodyXml,
      xml,
    };
  }

  private parseStatements(): BlockXml[] {
    const blocks: BlockXml[] = [];
    while (!this.check('PUNCTUATION', '}') && !this.check('EOF')) {
      const stmt = this.parseStatement();
      if (stmt) {
        if (Array.isArray(stmt)) {
          blocks.push(...stmt);
        } else {
          blocks.push(stmt);
        }
      }
    }
    return blocks;
  }

  private parseStatement(): BlockXml | BlockXml[] | null {
    const t = this.peek();
    const commentText = this.getCommentsAbove(t.line);
    try {
      const stmt = this.parseStatementInternal();
      if (stmt && commentText) {
        if (Array.isArray(stmt)) {
          if (stmt[0]) stmt[0].comment = commentText;
        } else {
          stmt.comment = commentText;
        }
      }
      return stmt;
    } catch (e) {
      if (e instanceof ParserError) {
        this.synchronize();
        return null;
      }
      throw e;
    }
  }

  private synchronize(): void {
    if (this.check('EOF')) return;
    this.advance(); // consume offending token
    while (!this.check('EOF')) {
      if (this.check('PUNCTUATION', ';')) {
        this.advance();
        return;
      }
      if (this.check('PUNCTUATION', '}')) {
        return;
      }
      const nextToken = this.peek();
      if (
        nextToken.type === 'KEYWORD' &&
        [
          'if',
          'while',
          'for',
          'return',
          'const',
          'void',
          'int',
          'float',
          'double',
          'char',
          'String',
          'bool',
        ].includes(nextToken.value)
      ) {
        return;
      }
      this.advance();
    }
  }

  private parseStatementInternal(): BlockXml | BlockXml[] | null {
    const t = this.peek();

    if (t.type === 'PUNCTUATION' && t.value === ';') {
      this.advance();
      return null;
    }

    if (t.type === 'KEYWORD' && t.value === 'if') {
      return this.parseIfStatement();
    }

    if (t.type === 'KEYWORD' && t.value === 'while') {
      return this.parseWhileStatement();
    }

    if (t.type === 'KEYWORD' && t.value === 'for') {
      return this.parseForStatement();
    }

    if (
      (t.type === 'KEYWORD' &&
        ['const', 'int', 'float', 'double', 'char', 'String', 'bool'].includes(t.value)) ||
      this.isVariableDeclaration()
    ) {
      return this.parseLocalVariable();
    }

    if (t.type === 'KEYWORD' && t.value === 'return') {
      this.advance();
      let valueXml = '';
      if (!this.check('PUNCTUATION', ';')) {
        valueXml = this.parseExpression();
      }
      this.consume('PUNCTUATION', ';');
      return {
        type: 'procedures_return',
        fields: {},
        values: valueXml ? { VALUE: valueXml } : {},
      };
    }

    if (t.type === 'KEYWORD' && (t.value === 'break' || t.value === 'continue')) {
      this.advance();
      this.consume('PUNCTUATION', ';');
      return {
        type: 'controls_flow_statements',
        fields: { FLOW: t.value.toUpperCase() },
      };
    }

    const expr = this.parseExpressionStatement();
    this.consume('PUNCTUATION', ';', 'Expected semicolon after statement');
    return expr;
  }

  private parseIfStatement(): BlockXml {
    this.consume('KEYWORD', 'if');
    this.consume('PUNCTUATION', '(');
    const condXml = this.parseExpression();
    this.consume('PUNCTUATION', ')');

    this.consume('PUNCTUATION', '{');
    const thenBlocks = this.parseStatements();
    this.consume('PUNCTUATION', '}');

    const elseIfs: { cond: string; body: string }[] = [];
    let elseBody = '';

    while (this.check('KEYWORD', 'else')) {
      this.advance();
      if (this.check('KEYWORD', 'if')) {
        this.advance();
        this.consume('PUNCTUATION', '(');
        const elseIfCond = this.parseExpression();
        this.consume('PUNCTUATION', ')');

        this.consume('PUNCTUATION', '{');
        const elseIfBlocks = this.parseStatements();
        this.consume('PUNCTUATION', '}');

        elseIfs.push({ cond: elseIfCond, body: this.statementsToXml(elseIfBlocks) });
      } else {
        this.consume('PUNCTUATION', '{');
        const elseBlocks = this.parseStatements();
        this.consume('PUNCTUATION', '}');
        elseBody = this.statementsToXml(elseBlocks);
        break;
      }
    }

    const values: Record<string, string> = { IF0: condXml };
    const statements: Record<string, string> = { DO0: this.statementsToXml(thenBlocks) };

    let mutation = '';
    if (elseIfs.length > 0 || elseBody) {
      mutation = `<mutation elseif="${elseIfs.length}" else="${elseBody ? 1 : 0}"></mutation>`;
    }

    for (let i = 0; i < elseIfs.length; i++) {
      const item = elseIfs[i];
      if (item) {
        values[`IF${i + 1}`] = item.cond;
        statements[`DO${i + 1}`] = item.body;
      }
    }
    if (elseBody) {
      statements['ELSE'] = elseBody;
    }

    return {
      type: 'controls_if',
      mutation,
      fields: {},
      values,
      statements,
    };
  }

  private parseWhileStatement(): BlockXml {
    this.consume('KEYWORD', 'while');
    this.consume('PUNCTUATION', '(');
    const condXml = this.parseExpression();
    this.consume('PUNCTUATION', ')');

    this.consume('PUNCTUATION', '{');
    const bodyBlocks = this.parseStatements();
    this.consume('PUNCTUATION', '}');

    return {
      type: 'controls_whileUntil',
      fields: { MODE: 'WHILE' },
      values: { BOOL: condXml },
      statements: { DO: this.statementsToXml(bodyBlocks) },
    };
  }

  private parseForStatement(): BlockXml {
    this.consume('KEYWORD', 'for');
    this.consume('PUNCTUATION', '(');

    // Check for empty loop for(;;)
    if (this.check('PUNCTUATION', ';')) {
      this.advance(); // consume ';'
      this.consume('PUNCTUATION', ';'); // consume ';'
      this.consume('PUNCTUATION', ')'); // consume ')'
      this.consume('PUNCTUATION', '{');
      const bodyBlocks = this.parseStatements();
      this.consume('PUNCTUATION', '}');
      return {
        type: 'controls_whileUntil',
        fields: { MODE: 'WHILE' },
        values: {
          BOOL: `<block type="logic_boolean"><field name="BOOL">TRUE</field></block>`,
        },
        statements: { DO: this.statementsToXml(bodyBlocks) },
      };
    }

    if (this.check('KEYWORD')) this.advance();
    const varToken = this.consume(
      'IDENTIFIER',
      undefined,
      'Expected variable in for-loop initialization',
    );
    const varName = varToken.value;
    this.variables.add(varName);

    this.consume('OPERATOR', '=');
    const fromXml = this.parseExpression(true);
    this.consume('PUNCTUATION', ';');

    let toXml = `<block type="math_number"><field name="NUM">10</field></block>`;
    if (!this.check('PUNCTUATION', ';')) {
      this.consume('IDENTIFIER', varName, `Expected loop variable '${varName}' in condition`);
      this.consume('OPERATOR', undefined, 'Expected comparison operator in loop condition');
      toXml = this.parseExpression(true);
    }
    this.consume('PUNCTUATION', ';');

    let byXml = `<block type="math_number"><field name="NUM">1</field></block>`;
    if (!this.check('PUNCTUATION', ')')) {
      this.consume('IDENTIFIER', varName, `Expected loop variable '${varName}' in step`);
      if (this.check('OPERATOR', '++')) {
        this.advance();
      } else if (this.check('OPERATOR', '--')) {
        this.advance();
        byXml = `<block type="math_number"><field name="NUM">-1</field></block>`;
      } else if (this.check('OPERATOR', '+=')) {
        this.advance();
        byXml = this.parseExpression(true);
      } else if (this.check('OPERATOR', '-=')) {
        this.advance();
        const stepVal = this.parseExpression(true);
        byXml = `<block type="math_arithmetic">
          <field name="OP">MINUS</field>
          <value name="A"><block type="math_number"><field name="NUM">0</field></block></value>
          <value name="B">${stepVal}</value>
        </block>`;
      } else if (this.check('OPERATOR', '=')) {
        this.advance();
        this.consume('IDENTIFIER', varName);
        const stepOp = this.consume('OPERATOR');
        const stepVal = this.parseExpression(true);
        if (stepOp.value === '+') {
          byXml = stepVal;
        } else {
          byXml = `<block type="math_arithmetic">
            <field name="OP">MINUS</field>
            <value name="A"><block type="math_number"><field name="NUM">0</field></block></value>
            <value name="B">${stepVal}</value>
          </block>`;
        }
      }
    }
    this.consume('PUNCTUATION', ')');

    this.consume('PUNCTUATION', '{');
    const bodyBlocks = this.parseStatements();
    this.consume('PUNCTUATION', '}');

    return {
      type: 'controls_for',
      fields: { VAR: varName },
      values: {
        FROM: fromXml,
        TO: toXml,
        BY: byXml,
      },
      statements: { DO: this.statementsToXml(bodyBlocks) },
    };
  }

  private parseLocalVariable(): BlockXml[] {
    if (this.check('KEYWORD', 'const')) this.advance();
    const typeToken = this.advance(); // type
    const decls: BlockXml[] = [];

    while (true) {
      const nameToken = this.consume('IDENTIFIER', undefined, 'Expected variable name');
      if (this.check('PUNCTUATION', '[')) {
        this.advance();
        if (this.check('NUMBER')) this.advance();
        this.consume('PUNCTUATION', ']');
      }
      this.variables.add(nameToken.value);
      this.variableTypes.set(nameToken.value, typeToken.value);

      let valXml = `<block type="math_number"><field name="NUM">0</field></block>`;
      if (this.check('OPERATOR', '=')) {
        this.advance();
        valXml = this.parseExpression(true);
      }

      decls.push({
        type: 'variables_set',
        fields: { VAR: nameToken.value },
        values: { VALUE: valXml },
      });

      if (this.check('PUNCTUATION', ',')) {
        this.advance();
      } else {
        break;
      }
    }
    this.consume('PUNCTUATION', ';');

    return decls;
  }

  private parseExpressionStatement(): BlockXml {
    const leftToken = this.peek();

    if (leftToken.type === 'IDENTIFIER') {
      const name = leftToken.value;
      const nextToken = this.tokens[this.current + 1];
      if (nextToken && nextToken.type === 'OPERATOR') {
        if (nextToken.value === '++') {
          this.advance();
          this.advance();
          this.variables.add(name);
          return {
            type: 'math_change',
            fields: { VAR: name },
            values: { DELTA: `<block type="math_number"><field name="NUM">1</field></block>` },
          };
        }
        if (nextToken.value === '--') {
          this.advance();
          this.advance();
          this.variables.add(name);
          return {
            type: 'math_change',
            fields: { VAR: name },
            values: { DELTA: `<block type="math_number"><field name="NUM">-1</field></block>` },
          };
        }
        if (nextToken.value === '+=') {
          this.advance();
          this.advance();
          this.variables.add(name);
          const deltaXml = this.parseExpression();
          return {
            type: 'math_change',
            fields: { VAR: name },
            values: { DELTA: deltaXml },
          };
        }
        if (nextToken.value === '=') {
          this.advance();
          this.advance();
          this.variables.add(name);
          const valXml = this.parseExpression();
          return {
            type: 'variables_set',
            fields: { VAR: name },
            values: { VALUE: valXml },
          };
        }
      }
    }

    const exprXml = this.parseExpression();
    return {
      type: 'raw_expr',
      rawXml: exprXml,
    };
  }

  private parseExpression(inExpression = false): string {
    this.expressionDepth++;
    if (this.expressionDepth > 200) {
      throw new ParserError(
        'Maximum expression nesting depth exceeded',
        this.peek().line,
        this.peek().col,
      );
    }
    const xml = this.parseLogicalOr(inExpression);
    this.expressionDepth--;
    return xml;
  }

  private parseLogicalOr(inExpression = false): string {
    let xml = this.parseLogicalAnd(inExpression);
    while (this.check('OPERATOR', '||')) {
      this.advance();
      const rightXml = this.parseLogicalAnd(inExpression);
      xml = `<block type="logic_operation">
        <field name="OP">OR</field>
        <value name="A">${xml}</value>
        <value name="B">${rightXml}</value>
      </block>`;
    }
    return xml;
  }

  private parseLogicalAnd(inExpression = false): string {
    let xml = this.parseEquality(inExpression);
    while (this.check('OPERATOR', '&&')) {
      this.advance();
      const rightXml = this.parseEquality(inExpression);
      xml = `<block type="logic_operation">
        <field name="OP">AND</field>
        <value name="A">${xml}</value>
        <value name="B">${rightXml}</value>
      </block>`;
    }
    return xml;
  }

  private parseEquality(inExpression = false): string {
    let xml = this.parseComparison(inExpression);
    while (this.check('OPERATOR', '==') || this.check('OPERATOR', '!=')) {
      const op = this.advance().value;
      const rightXml = this.parseComparison(inExpression);
      const blockOp = op === '==' ? 'EQ' : 'NEQ';
      xml = `<block type="logic_compare">
        <field name="OP">${blockOp}</field>
        <value name="A">${xml}</value>
        <value name="B">${rightXml}</value>
      </block>`;
    }
    return xml;
  }

  private parseComparison(inExpression = false): string {
    let xml = this.parseAdditive(inExpression);
    while (
      this.check('OPERATOR', '<') ||
      this.check('OPERATOR', '<=') ||
      this.check('OPERATOR', '>') ||
      this.check('OPERATOR', '>=')
    ) {
      const op = this.advance().value;
      const rightXml = this.parseAdditive(inExpression);
      const OPS: Record<string, string> = {
        '<': 'LT',
        '<=': 'LTE',
        '>': 'GT',
        '>=': 'GTE',
      };
      xml = `<block type="logic_compare">
        <field name="OP">${OPS[op]}</field>
        <value name="A">${xml}</value>
        <value name="B">${rightXml}</value>
      </block>`;
    }
    return xml;
  }

  private parseAdditive(inExpression = false): string {
    let xml = this.parseMultiplicative(inExpression);
    while (this.check('OPERATOR', '+') || this.check('OPERATOR', '-')) {
      const op = this.advance().value;
      const rightXml = this.parseMultiplicative(inExpression);
      const blockOp = op === '+' ? 'ADD' : 'MINUS';
      xml = `<block type="math_arithmetic">
        <field name="OP">${blockOp}</field>
        <value name="A">${xml}</value>
        <value name="B">${rightXml}</value>
      </block>`;
    }
    return xml;
  }

  private parseMultiplicative(inExpression = false): string {
    let xml = this.parseUnary(inExpression);
    while (
      this.check('OPERATOR', '*') ||
      this.check('OPERATOR', '/') ||
      this.check('OPERATOR', '%')
    ) {
      const op = this.advance().value;
      const rightXml = this.parseUnary(inExpression);
      if (op === '%') {
        xml = `<block type="math_modulo">
          <value name="DIVIDEND">${xml}</value>
          <value name="DIVISOR">${rightXml}</value>
        </block>`;
      } else {
        const blockOp = op === '*' ? 'MULTIPLY' : 'DIVIDE';
        xml = `<block type="math_arithmetic">
          <field name="OP">${blockOp}</field>
          <value name="A">${xml}</value>
          <value name="B">${rightXml}</value>
        </block>`;
      }
    }
    return xml;
  }

  private parseUnary(inExpression = false): string {
    if (this.check('OPERATOR', '!')) {
      this.advance();
      const exprXml = this.parseUnary(inExpression);
      return `<block type="logic_negate">
        <value name="BOOL">${exprXml}</value>
      </block>`;
    }
    if (this.check('OPERATOR', '-')) {
      this.advance();
      const exprXml = this.parseUnary(inExpression);
      if (exprXml.includes('type="math_number"')) {
        return exprXml.replace(/<field name="NUM">/, '<field name="NUM">-');
      }
      return `<block type="math_arithmetic">
        <field name="OP">MINUS</field>
        <value name="A"><block type="math_number"><field name="NUM">0</field></block></value>
        <value name="B">${exprXml}</value>
      </block>`;
    }
    return this.parsePrimary(inExpression);
  }

  private parseInitializerList(): string {
    this.consume('PUNCTUATION', '{');
    const items: string[] = [];
    while (!this.check('PUNCTUATION', '}')) {
      items.push(this.parseExpression(true));
      if (this.check('PUNCTUATION', ',')) this.advance();
    }
    this.consume('PUNCTUATION', '}');
    return `<block type="lists_create_with">
      <mutation items="${items.length}"></mutation>
      ${items.map((item, idx) => `<value name="ADD${idx}">${item}</value>`).join('')}
    </block>`;
  }

  private parsePrimary(inExpression = false): string {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.advance();
      const val = t.value.replace(/[uUlL]+$/, '');
      return `<block type="math_number"><field name="NUM">${escapeXml(val)}</field></block>`;
    }

    if (t.type === 'STRING') {
      this.advance();
      return `<block type="text"><field name="TEXT">${escapeXml(t.value)}</field></block>`;
    }

    if (t.type === 'KEYWORD' && (t.value === 'true' || t.value === 'false')) {
      this.advance();
      return `<block type="logic_boolean"><field name="BOOL">${escapeXml(t.value.toUpperCase())}</field></block>`;
    }

    if (t.type === 'PUNCTUATION' && t.value === '{') {
      return this.parseInitializerList();
    }

    if (t.type === 'IDENTIFIER') {
      let name = t.value;
      this.advance();

      if (this.check('PUNCTUATION', '.')) {
        this.advance(); // consume '.'
        const memberToken = this.consume('IDENTIFIER', undefined, 'Expected member name after dot');
        const memberName = memberToken.value;

        if (this.check('PUNCTUATION', '(')) {
          return this.parseMethodCall(name, memberName, inExpression);
        }

        name = `${name}.${memberName}`;
      }

      if (this.check('PUNCTUATION', '(')) {
        return this.parseFunctionCall(name, inExpression);
      }

      this.variables.add(name);
      return `<block type="variables_get"><field name="VAR">${escapeXml(name)}</field></block>`;
    }

    if (t.type === 'PUNCTUATION' && t.value === '(') {
      this.advance();
      const exprXml = this.parseExpression(inExpression);
      this.consume('PUNCTUATION', ')');
      return exprXml;
    }

    throw new ParserError(`Unexpected token '${t.value}' in expression`, t.line, t.col);
  }

  private parseFunctionCall(name: string, inExpression = false): string {
    this.consume('PUNCTUATION', '(');
    const args: string[] = [];
    while (!this.check('PUNCTUATION', ')')) {
      args.push(this.parseExpression(true));
      if (this.check('PUNCTUATION', ',')) this.advance();
    }
    this.consume('PUNCTUATION', ')');

    if (name === 'pinMode') {
      const pinVal = this.getLiteralValue(args[0]) || '13';
      const modeVal = this.getLiteralValue(args[1]) || 'OUTPUT';
      return `<block type="arduino_pin_mode">
        <field name="PIN">${escapeXml(pinVal)}</field>
        <field name="MODE">${escapeXml(modeVal)}</field>
      </block>`;
    }

    if (name === 'digitalWrite') {
      const pinVal = this.getLiteralValue(args[0]) || '13';
      const modeVal = this.getLiteralValue(args[1]) || 'HIGH';
      return `<block type="arduino_digital_write">
        <field name="PIN">${escapeXml(pinVal)}</field>
        <field name="VALUE">${escapeXml(modeVal)}</field>
      </block>`;
    }

    if (name === 'digitalRead') {
      const pinVal = this.getLiteralValue(args[0]) || '13';
      return `<block type="arduino_digital_read">
        <field name="PIN">${escapeXml(pinVal)}</field>
      </block>`;
    }

    if (name === 'analogRead') {
      const pinVal = this.getLiteralValue(args[0]) || 'A0';
      return `<block type="arduino_analog_read">
        <field name="PIN">${escapeXml(pinVal)}</field>
      </block>`;
    }

    if (name === 'analogWrite') {
      const pinVal = this.getLiteralValue(args[0]) || '3';
      const valXml = args[1] || `<block type="math_number"><field name="NUM">0</field></block>`;
      return `<block type="arduino_analog_write">
        <field name="PIN">${escapeXml(pinVal)}</field>
        <value name="VALUE">${valXml}</value>
      </block>`;
    }

    if (name === 'delay') {
      const valXml = args[0] || `<block type="math_number"><field name="NUM">0</field></block>`;
      let unit = 'milli';
      let cleanValXml = valXml;

      if (valXml.includes('OP">MULTIPLY') && valXml.includes('NUM">1000')) {
        unit = 'sec';
        const match = valXml.match(/<value name="A">([\s\S]+?)<\/value>/);
        if (match) {
          cleanValXml = match[1] ?? '';
        }
      }

      return `<block type="arduino_delay">
        <field name="TIME_UNIT">${escapeXml(unit)}</field>
        <value name="DELAY_TIME">${cleanValXml}</value>
      </block>`;
    }

    if (name === 'delayMicroseconds') {
      const valXml = args[0] || `<block type="math_number"><field name="NUM">0</field></block>`;
      return `<block type="arduino_delay">
        <field name="TIME_UNIT">micro</field>
        <value name="DELAY_TIME">${valXml}</value>
      </block>`;
    }

    if (name === 'millis') {
      return `<block type="arduino_millis"></block>`;
    }

    const standardFunctions = new Set([
      'pinMode',
      'digitalWrite',
      'digitalRead',
      'analogRead',
      'analogWrite',
      'delay',
      'delayMicroseconds',
      'millis',
    ]);
    if (!standardFunctions.has(name)) {
      this.calledProcedures.set(
        name,
        args.map((_, i) => `arg${i}`),
      );
    }

    const callType = inExpression ? 'procedures_callreturn' : 'procedures_callnoreturn';
    return `<block type="${callType}">
      <mutation name="${escapeXml(name)}">
        ${args.map((_, i) => `<arg name="arg${i}"></arg>`).join('')}
      </mutation>
      ${args.map((argXml, i) => `<value name="ARG${i}">${argXml}</value>`).join('')}
    </block>`;
  }

  private parseMethodCall(objName: string, methodName: string, inExpression = false): string {
    this.consume('PUNCTUATION', '(');
    const args: string[] = [];
    while (!this.check('PUNCTUATION', ')')) {
      args.push(this.parseExpression(true));
      if (this.check('PUNCTUATION', ',')) this.advance();
    }
    this.consume('PUNCTUATION', ')');

    if (objName === 'Serial') {
      if (methodName === 'begin') {
        const baudVal = this.getLiteralValue(args[0]) || '9600';
        return `<block type="arduino_serial_begin">
          <field name="BAUD">${escapeXml(baudVal)}</field>
        </block>`;
      }
      if (methodName === 'print') {
        const valXml = args[0] || `<block type="text"><field name="TEXT"></field></block>`;
        return `<block type="arduino_serial_print">
          <value name="VALUE">${valXml}</value>
        </block>`;
      }
      if (methodName === 'println') {
        const valXml = args[0] || `<block type="text"><field name="TEXT"></field></block>`;
        return `<block type="arduino_serial_println">
          <value name="VALUE">${valXml}</value>
        </block>`;
      }
    }

    const objType = this.variableTypes.get(objName);

    if (objType === 'Servo') {
      if (methodName === 'attach') {
        const pinVal = this.getLiteralValue(args[0]) || '9';
        return `<block type="servo_attach">
          <value name="PIN">
            <block type="math_number"><field name="NUM">${escapeXml(pinVal)}</field></block>
          </value>
        </block>`;
      }
      if (methodName === 'write') {
        const angleVal = this.getLiteralValue(args[0]) || '90';
        return `<block type="servo_write">
          <value name="ANGLE">
            <block type="math_number"><field name="NUM">${escapeXml(angleVal)}</field></block>
          </value>
        </block>`;
      }
      if (methodName === 'read') {
        return `<block type="servo_read"></block>`;
      }
    }

    const fullCallName = `${objName}.${methodName}`;
    this.calledProcedures.set(
      fullCallName,
      args.map((_, i) => `arg${i}`),
    );

    const callType = inExpression ? 'procedures_callreturn' : 'procedures_callnoreturn';
    return `<block type="${callType}">
      <mutation name="${escapeXml(fullCallName)}">
        ${args.map((_, i) => `<arg name="arg${i}"></arg>`).join('')}
      </mutation>
      ${args.map((argXml, i) => `<value name="ARG${i}">${argXml}</value>`).join('')}
    </block>`;
  }

  private getLiteralValue(xml: string | undefined): string | null {
    if (!xml) return null;
    let match = xml.match(/<field name="NUM">([^<]+)<\/field>/);
    if (match && match[1] !== undefined) return match[1];
    match = xml.match(/<field name="TEXT">([^<]+)<\/field>/);
    if (match && match[1] !== undefined) return match[1];
    match = xml.match(/<field name="BOOL">([^<]+)<\/field>/);
    if (match && match[1] !== undefined) return match[1];
    match = xml.match(/<field name="VAR">([^<]+)<\/field>/);
    if (match && match[1] !== undefined) return match[1];
    return null;
  }

  private statementsToXml(blocks: BlockXml[]): string {
    if (blocks.length === 0) return '';
    let xml = '';
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (!b) continue;
      if (b.rawXml) {
        let blockXml = b.rawXml;
        if (b.comment) {
          const idx = blockXml.indexOf('>');
          if (idx !== -1) {
            const commentTag = `<comment pinned="false" h="80" w="160">${escapeXml(b.comment)}</comment>`;
            blockXml = blockXml.substring(0, idx + 1) + commentTag + blockXml.substring(idx + 1);
          }
        }
        if (xml) {
          const idx = blockXml.lastIndexOf('</block>');
          if (idx !== -1) {
            xml = blockXml.substring(0, idx) + `<next>${xml}</next>` + blockXml.substring(idx);
          } else {
            xml = blockXml + xml;
          }
        } else {
          xml = blockXml;
        }
      } else {
        let blockStr = `<block type="${escapeXml(b.type)}">`;
        if (b.comment) {
          blockStr += `<comment pinned="false" h="80" w="160">${escapeXml(b.comment)}</comment>`;
        }
        if (b.mutation) {
          blockStr += b.mutation;
        }
        for (const [fName, fVal] of Object.entries(b.fields || {})) {
          blockStr += `<field name="${escapeXml(fName)}">${escapeXml(fVal)}</field>`;
        }
        for (const [vName, vXml] of Object.entries(b.values || {})) {
          blockStr += `<value name="${escapeXml(vName)}">${vXml}</value>`;
        }
        for (const [sName, sXml] of Object.entries(b.statements || {})) {
          blockStr += `<statement name="${escapeXml(sName)}">${sXml}</statement>`;
        }
        if (xml) {
          blockStr += `<next>${xml}</next>`;
        }
        blockStr += '</block>';
        xml = blockStr;
      }
    }
    return xml;
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export function cppToBlocks(code: string): string {
  const { tokens, comments } = tokenize(code);
  const parser = new Parser(tokens, comments);
  const res = parser.parse();

  const varsXml = res.variables.map((v) => `<variable>${escapeXml(v)}</variable>`).join('\n');

  const functionsXml: string[] = [];
  let yOffset = 100;
  for (const fnXml of res.functions) {
    const withCoords = fnXml.replace('<block type="', `<block x="500" y="${yOffset}" type="`);
    functionsXml.push(withCoords);
    yOffset += 300;
  }

  const additionalDefs: string[] = [];
  for (const [procName, argNames] of parser.calledProcedures.entries()) {
    if (!parser.definedFunctions.has(procName)) {
      const defXml = `<block type="procedures_defnoreturn" x="500" y="${yOffset}">
        <field name="NAME">${escapeXml(procName)}</field>
        <mutation>
          ${argNames.map((arg) => `<arg name="${escapeXml(arg)}"></arg>`).join('')}
        </mutation>
      </block>`;
      additionalDefs.push(defXml);
      yOffset += 150;
    }
  }

  const rootBlockXml = `<block type="arduino_program" id="root_program" x="20" y="20">
    <field name="TITLE">Arduino Program</field>
    <statement name="SETUP">
      ${res.setupCode}
    </statement>
    <statement name="LOOP">
      ${res.loopCode}
    </statement>
  </block>`;

  return `<xml xmlns="https://developers.google.com/blockly/xml">
    <variables>
      ${varsXml}
    </variables>
    ${rootBlockXml}
    ${functionsXml.join('\n')}
    ${additionalDefs.join('\n')}
  </xml>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
