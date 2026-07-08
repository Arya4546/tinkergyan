/**
 * BlocklyWorkspace.tsx
 *
 * Renders the Blockly block editor canvas.
 * - Imports custom Arduino block definitions and the C++ generator.
 * - Exposes getXml() and loadXml() via ref for save/load.
 * - Reports generated C++ on every workspace change via onCodeChange.
 * - Uses a custom Blockly Theme (kidFriendly / darkKidFriendly) so that
 *   category colors, font, and flyout styling come from the official API
 *   rather than fragile CSS overrides on internal Blockly class names.
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';

// Custom Arduino extensions — must be imported before inject()
import './arduino-blocks';
import './scratch-blocks';
import { arduinoGenerator } from './arduino-generator';
import { INITIAL_TOOLBOX } from './toolbox';
import { useUIStore } from '../../stores/ui.store';
import { useEditorStore } from '../../stores/editor.store';

declare global {
  interface Window {
    Blockly: typeof Blockly;
  }
}

Blockly.setLocale(En as unknown as Record<string, string>);
window.Blockly = Blockly;

const BOARDS = [
  { fqbn: 'arduino:avr:uno', label: 'Arduino Uno' },
  { fqbn: 'arduino:avr:mega', label: 'Arduino Mega' },
  { fqbn: 'esp8266:esp8266:nodemcuv2', label: 'NodeMCU (ESP8266)' },
] as const;

// ─── Blockly theme definitions ────────────────────────────────────────────────
//
// categoryStyles keys must match the `categorystyle` values in toolbox.ts.
// toolbox.ts must NOT have inline `colour:` fields — if both colour and
// categorystyle are present, Blockly silently ignores categorystyle.

const KID_CATEGORY_STYLES = {
  program_category: { colour: '#1565C0' },
  digital_category: { colour: '#2E7D32' },
  analog_category: { colour: '#E65100' },
  control_category: { colour: '#6A1B9A' },
  serial_category: { colour: '#B71C1C' },
  logic_category: { colour: '#5C81A6' },
  loop_category: { colour: '#5CA65C' },
  math_category: { colour: '#5C68A6' },
  text_category: { colour: '#5BA58C' },
  variable_category: { colour: '#A65C5C' },
  function_category: { colour: '#9A5CA6' },
  scratch_events_category: { colour: '#FFBF00' },
  scratch_motion_category: { colour: '#4C97FF' },
  scratch_looks_category: { colour: '#9966FF' },
};

const KID_FONT: Blockly.Theme.FontStyle = {
  family: 'Inter, system-ui, sans-serif',
  weight: '600',
  size: 13,
};

const kidTheme = Blockly.Theme.defineTheme('kidFriendly', {
  name: 'kidFriendly',
  base: Blockly.Themes.Classic,
  categoryStyles: KID_CATEGORY_STYLES,
  componentStyles: {
    workspaceBackgroundColour: '#F7F8FC',
    toolboxBackgroundColour: '#FFFFFF',
    toolboxForegroundColour: '#1A1B2E',
    flyoutBackgroundColour: '#F1F5F9',
    flyoutForegroundColour: '#1A1B2E',
    flyoutOpacity: 1.0,
    scrollbarColour: '#CBD5E1',
    scrollbarOpacity: 0.4,
    insertionMarkerColour: '#6C63FF',
    insertionMarkerOpacity: 0.5,
    markerColour: '#6C63FF',
    cursorColour: '#6C63FF',
  },
  fontStyle: KID_FONT,
});

const darkKidTheme = Blockly.Theme.defineTheme('darkKidFriendly', {
  name: 'darkKidFriendly',
  base: Blockly.Themes.Classic,
  categoryStyles: KID_CATEGORY_STYLES,
  componentStyles: {
    workspaceBackgroundColour: '#1A1B2E',
    toolboxBackgroundColour: '#252640',
    toolboxForegroundColour: '#E2E8F0',
    flyoutBackgroundColour: '#252640',
    flyoutForegroundColour: '#E2E8F0',
    flyoutOpacity: 1.0,
    scrollbarColour: '#2E3055',
    scrollbarOpacity: 0.4,
    insertionMarkerColour: '#7B72FF',
    insertionMarkerOpacity: 0.5,
    markerColour: '#7B72FF',
    cursorColour: '#7B72FF',
  },
  fontStyle: KID_FONT,
});

// ─── Public ref handle ────────────────────────────────────────────────────────
export interface BlocklyWorkspaceHandle {
  /** Serialize the current workspace to an XML string. */
  getXml: () => string;
  /** Deserialize an XML string into the workspace (replaces current state). */
  loadXml: (xml: string) => void;
  /** Return the current generated C++ code without triggering onCodeChange. */
  getCode: () => string;
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BlocklyWorkspaceProps {
  onCodeChange: (code: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(
  ({ onCodeChange, className = '' }, ref) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const theme = useUIStore((s) => s.theme);
    const board = useEditorStore((s) => s.board);

    const [promptData, setPromptData] = React.useState<{
      message: string;
      defaultValue: string;
      callback: (result: string | null) => void;
    } | null>(null);
    const [promptValue, setPromptValue] = React.useState('');

    // Intercept Blockly prompts to show a beautiful, premium custom React modal
    useEffect(() => {
      Blockly.dialog.setPrompt((message, defaultValue, callback) => {
        setPromptData({ message, defaultValue, callback });
        setPromptValue(defaultValue);
      });
      return () => {
        Blockly.dialog.setPrompt(Blockly.dialog.prompt);
      };
    }, []);

    // Expose imperative methods for save/load/getCode
    useImperativeHandle(ref, () => ({
      getXml() {
        if (!workspaceRef.current) return '';
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        return Blockly.Xml.domToText(xml);
      },
      loadXml(xml: string) {
        if (!workspaceRef.current || !xml) return;
        try {
          workspaceRef.current.clear();
          // Remove movable="false", deletable="false", and inline="true" from legacy block saves
          const cleanXml = xml
            .replace(/movable="false"/g, '')
            .replace(/deletable="false"/g, '')
            .replace(/inline="true"/g, '');

          // Blockly 11 removed Xml.textToDom — use the native DOMParser instead.
          const parser = new DOMParser();
          const doc = parser.parseFromString(cleanXml, 'text/xml');
          const dom = doc.documentElement;
          Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
        } catch {
          // Ignore malformed XML — workspace stays as-is
        }
      },
      getCode() {
        if (!workspaceRef.current) return '';
        return arduinoGenerator.workspaceToCode(workspaceRef.current);
      },
      undo() {
        if (!workspaceRef.current) return;
        workspaceRef.current.undo(false);
      },
      redo() {
        if (!workspaceRef.current) return;
        workspaceRef.current.undo(true);
      },
    }));

    const isInit = useRef(false);

    // Resolve which Blockly theme to use based on current UI theme setting
    const resolveBlocklyTheme = (currentTheme: string) => {
      if (currentTheme === 'dark') return darkKidTheme;
      if (currentTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? darkKidTheme : kidTheme;
      }
      return kidTheme;
    };

    // Initialize Blockly once the container div is mounted
    useEffect(() => {
      if (isInit.current || workspaceRef.current || !blocklyDiv.current) return;

      // Clear out any ghost DOM nodes from React 18 StrictMode unmounts
      blocklyDiv.current.innerHTML = '';
      isInit.current = true;

      // ── Ensure html.dark class matches the resolved Blockly theme BEFORE inject ──
      // Navbar's useEffect may not have fired yet on first render, so we sync it here.
      const initialTheme = useUIStore.getState().theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = initialTheme === 'dark' || (initialTheme === 'system' && prefersDark);
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox: INITIAL_TOOLBOX,
        theme: resolveBlocklyTheme(useUIStore.getState().theme),
        move: {
          scrollbars: true,
          drag: true,
          wheel: true,
        },
        grid: {
          spacing: 24,
          length: 3,
          colour: shouldBeDark ? '#2E3055' : '#e2e8f0',
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        trashcan: true,
      });

      const onChange = (event: Blockly.Events.Abstract) => {
        const type = event.type;
        // Skip pure UI events that don't affect code
        if (
          type === (Blockly.Events.VIEWPORT_CHANGE as string) ||
          type === (Blockly.Events.THEME_CHANGE as string) ||
          type === (Blockly.Events.BUBBLE_OPEN as string) ||
          type === (Blockly.Events.TRASHCAN_OPEN as string)
        ) {
          return;
        }
        if (!workspaceRef.current) return;
        try {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChange(code);
        } catch {
          // Generator errors should not crash the editor
        }
      };

      workspaceRef.current.addChangeListener(onChange);

      // Auto-place the root arduino_program block so users have setup()/loop()
      const rootBlock = workspaceRef.current.newBlock('arduino_program');
      rootBlock.initSvg();
      rootBlock.render();
      rootBlock.moveBy(20, 20);

      // Set initial board title on the root block
      const initialBoard = useEditorStore.getState().board;
      const boardLabel = BOARDS.find((b) => b.fqbn === initialBoard)?.label || 'Arduino';
      rootBlock.setFieldValue(`${boardLabel} Program`, 'TITLE');

      // Emit initial code from the root block
      try {
        const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
        onCodeChange(code);
      } catch {
        onCodeChange('');
      }

      // DO NOT put dispose() here to prevent strict mode from breaking global drag event listeners
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally runs once — workspace lifecycle is managed internally

    // Sync board changes to update the root block's title and re-generate code
    useEffect(() => {
      if (!workspaceRef.current) return;
      const blocks = workspaceRef.current.getBlocksByType('arduino_program');
      const boardLabel = BOARDS.find((b) => b.fqbn === board)?.label || 'Arduino';
      for (const block of blocks) {
        block.setFieldValue(`${boardLabel} Program`, 'TITLE');
      }
      // Re-generate code so the C++ preview reflects the correct board-specific header
      try {
        const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
        onCodeChange(code);
      } catch {
        // Generator errors should not crash the editor
      }
    }, [board, onCodeChange]);

    // Sync theme changes — swap between kidTheme and darkKidTheme
    useEffect(() => {
      if (!workspaceRef.current) return;
      workspaceRef.current.setTheme(resolveBlocklyTheme(theme));
    }, [theme]);

    // Resize Blockly SVG when the window changes size
    useEffect(() => {
      const handleResize = () => {
        if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div ref={blocklyDiv} className="absolute inset-0" />

        {/* Custom dialog prompt modal for variable creation */}
        {promptData && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1f38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-sans mb-3">
                {promptData.message}
              </h3>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    promptData.callback(promptValue);
                    setPromptData(null);
                  } else if (e.key === 'Escape') {
                    promptData.callback(null);
                    setPromptData(null);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-[#131424] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 font-sans outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all mb-4"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    promptData.callback(null);
                    setPromptData(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-sans rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    promptData.callback(promptValue);
                    setPromptData(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 font-sans rounded-xl shadow-md shadow-indigo-600/10 transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

BlocklyWorkspace.displayName = 'BlocklyWorkspace';
