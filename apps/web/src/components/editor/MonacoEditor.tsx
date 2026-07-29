/**
 * MonacoEditor.tsx
 *
 * Thin wrapper around @monaco-editor/react configured for Arduino/C++.
 * - Language: "cpp" with Arduino API completions registered.
 * - Exposes inline error decorations driven by CompileError[].
 * - Syncs theme with the app's light/dark mode.
 * - Exposes getValue() via forwardRef for the parent to read code on demand.
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { useUIStore } from '../../stores/ui.store';
import { paletteFor } from '../../lib/editor-tokens';
import type { CompileError } from '../../stores/editor.store';

// monaco-editor types are re-exported from @monaco-editor/react's loader module.
// We import the global `monaco` type via the window namespace populated at runtime.
type IStandaloneCodeEditor = Parameters<OnMount>[0];
type IModelDecoration = { id: string; ownerId: number; range: any; options: any };
type IRange = {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
};
type CompletionItem = {
  label: string;
  kind: number;
  insertText: string;
  range: IRange;
  detail?: string;
  documentation?: string;
};

// ─── Arduino C++ completions ──────────────────────────────────────────────────
const ARDUINO_COMPLETIONS: string[] = [
  'pinMode',
  'digitalWrite',
  'digitalRead',
  'analogRead',
  'analogWrite',
  'delay',
  'millis',
  'micros',
  'delayMicroseconds',
  'Serial.begin',
  'Serial.print',
  'Serial.println',
  'Serial.available',
  'Serial.read',
  'HIGH',
  'LOW',
  'INPUT',
  'OUTPUT',
  'INPUT_PULLUP',
  'LED_BUILTIN',
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'map',
  'constrain',
  'random',
  'randomSeed',
  'abs',
  'min',
  'max',
  'void setup',
  'void loop',
];

// ─── Public ref handle ────────────────────────────────────────────────────────
export interface MonacoEditorHandle {
  getValue: () => string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  errorDecorations?: CompileError[];
  readOnly?: boolean;
  fontSize?: number;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  (
    { value, onChange, errorDecorations = [], readOnly = false, fontSize = 14, className = '' },
    ref,
  ) => {
    const theme = useUIStore((s: any) => s.theme);
    const monaco = useMonaco();
    const editorRef = useRef<IStandaloneCodeEditor | null>(null);
    const decorIds = useRef<string[]>([]);

    useImperativeHandle(ref, () => ({
      getValue: () => editorRef.current?.getValue() ?? '',
    }));

    // Register Arduino completions once Monaco is loaded
    useEffect(() => {
      if (!monaco) return;

      const disposable = monaco.languages.registerCompletionItemProvider('cpp', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range: IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: CompletionItem[] = ARDUINO_COMPLETIONS.map((label) => ({
            label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: label,
            range,
            detail: 'Arduino API',
            documentation: `Arduino function: ${label}`,
          }));

          return { suggestions };
        },
      });

      return () => disposable.dispose();
    }, [monaco]);

    // Define editor themes from the shared palette so the code pane sits on the
    // same surface ramp as the block canvas and the panels. Stock 'vs-dark'
    // ships its own #1e1e1e background, which is what made the code editor read
    // as a third, unrelated application on this screen.
    useEffect(() => {
      if (!monaco) return;
      for (const mode of ['light', 'dark'] as const) {
        const p = paletteFor(mode);
        monaco.editor.defineTheme(`tinkergyan-${mode}`, {
          base: mode === 'dark' ? 'vs-dark' : 'vs',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': p.well,
            'editor.foreground': p.textHi,
            'editorLineNumber.foreground': p.textLo,
            'editorLineNumber.activeForeground': p.textMid,
            'editorGutter.background': p.well,
            'editorCursor.foreground': p.accent,
            'editor.lineHighlightBackground': p.lineSoft,
            'editorWidget.background': p.panel,
            'editorWidget.border': p.line,
            'editorSuggestWidget.background': p.panel,
            'editorSuggestWidget.border': p.line,
            'editorIndentGuide.background1': p.line,
            'scrollbarSlider.background': `${p.scrollbar}80`,
            'scrollbarSlider.hoverBackground': p.scrollbar,
          },
        });
      }
    }, [monaco]);

    // Apply / update error decorations whenever compileErrors change
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor || !monaco) return;

      // Clear previous decorations
      decorIds.current = editor.deltaDecorations(decorIds.current, []);

      if (errorDecorations.length === 0) return;

      const newDecorations: IModelDecoration[] = errorDecorations
        .filter((e) => e.line > 0) // line 0 = unknown position
        .map((e) => ({
          id: '',
          ownerId: 0,
          range: new monaco.Range(e.line, 1, e.line, Infinity),
          options: {
            isWholeLine: true,
            className: e.severity === 'error' ? 'monaco-error-line' : 'monaco-warning-line',
            glyphMarginClassName:
              e.severity === 'error' ? 'monaco-error-glyph' : 'monaco-warning-glyph',
            hoverMessage: { value: `**${e.severity.toUpperCase()}** ${e.message}` },
            overviewRuler: {
              color: e.severity === 'error' ? '#FF6B6B' : '#FFB347',
              position: monaco.editor.OverviewRulerLane.Right,
            },
          },
        }));

      decorIds.current = editor.deltaDecorations([], newDecorations as any);
    }, [errorDecorations, monaco]);

    const handleMount = useCallback((editor: IStandaloneCodeEditor) => {
      editorRef.current = editor;
    }, []);

    // `theme` may be 'system' — resolving it here also fixes a latent bug where
    // system-dark users got the light editor.
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const monacoTheme = isDark ? 'tinkergyan-dark' : 'tinkergyan-light';

    return (
      <div className={`w-full h-full ${className}`}>
        <Editor
          height="100%"
          language="cpp"
          value={value}
          theme={monacoTheme}
          onChange={(v) => onChange?.(v ?? '')}
          onMount={handleMount}
          options={{
            readOnly,
            fontSize,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            scrollbar: { verticalScrollbarSize: 8 },
            padding: { top: 16 },
          }}
        />
      </div>
    );
  },
);

MonacoEditor.displayName = 'MonacoEditor';
