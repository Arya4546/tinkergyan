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
import { getToolbox } from './toolbox';
import { useUIStore } from '../../stores/ui.store';
import { useEditorStore } from '../../stores/editor.store';
import { getBoardLabel } from '../../lib/boards';
import {
  LIGHT,
  DARK,
  applyEditorTokens,
  paletteFor,
  type EditorPalette,
} from '../../lib/editor-tokens';

declare global {
  interface Window {
    Blockly: typeof Blockly;
  }
}

Blockly.setLocale(En as unknown as Record<string, string>);
window.Blockly = Blockly;

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
  scratch_sound_category: { colour: '#D65CD6' },
  scratch_control_category: { colour: '#FFAB19' },
  scratch_sensing_category: { colour: '#5CB1D6' },
  scratch_lists_category: { colour: '#FF8C1A' },
};

const KID_FONT: Blockly.Theme.FontStyle = {
  family: 'Inter, system-ui, sans-serif',
  weight: '600',
  size: 13,
};

/**
 * Build a Blockly theme from the shared editor palette.
 *
 * Blockly bakes these colours into SVG attributes at definition time and cannot
 * read CSS custom properties, which is exactly why the palette lives in
 * `editor-tokens.ts` as TypeScript — this is the one consumer that forces it.
 *
 * `workspaceBackgroundColour` is the token `well` and must stay the *lightest*
 * surface in both themes. Saturated Scratch block colours vibrate against a
 * near-black canvas; Scratch itself uses #F9F9F9 and Blockly's own dark themes
 * use mid-tones for the same reason.
 */
const buildTheme = (name: string, p: EditorPalette) =>
  Blockly.Theme.defineTheme(name, {
    name,
    base: Blockly.Themes.Classic,
    categoryStyles: KID_CATEGORY_STYLES,
    componentStyles: {
      workspaceBackgroundColour: p.well,
      toolboxBackgroundColour: p.panel,
      toolboxForegroundColour: p.textMid,
      flyoutBackgroundColour: p.panel,
      flyoutForegroundColour: p.textMid,
      flyoutOpacity: 1.0,
      scrollbarColour: p.scrollbar,
      scrollbarOpacity: 0.5,
      insertionMarkerColour: p.accent,
      insertionMarkerOpacity: 0.5,
      markerColour: p.accent,
      cursorColour: p.accent,
    },
    fontStyle: KID_FONT,
    // Scratch's domed "hat" on top of every event block. Without this the hat
    // blocks render as plain rounded rectangles and read as ordinary stackable
    // blocks, when their whole point is to say "a script starts here".
    // Blockly applies it to blocks with no previous *and* no output connection,
    // which is exactly the 4 scratch_event_* blocks plus arduino_program.
    startHats: true,
  });

const kidTheme = buildTheme('kidFriendly', LIGHT);
const darkKidTheme = buildTheme('darkKidFriendly', DARK);

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
  /** Delete every block on the workspace, leaving it empty (used by "Reset Project"). */
  clearWorkspace: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BlocklyWorkspaceProps {
  engineMode?: 'hardware' | 'software';
  onCodeChange: (code: string) => void;
  /**
   * Fires on every real (non-UI) workspace edit, whether or not C++ could be
   * generated from it.
   *
   * `onCodeChange` cannot serve this purpose: it only fires when the *Arduino*
   * generator succeeds, and that generator throws on `scratch_*` blocks
   * ("does not know how to generate code for block type ..."). In software mode
   * it therefore never fired at all, so nothing downstream ever learned that
   * the Scratch canvas had changed.
   */
  onWorkspaceChange?: () => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(
  ({ engineMode = 'hardware', onCodeChange, onWorkspaceChange, className = '' }, ref) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    // The workspace is created once (deps: []), so the change listener closes
    // over the first render's props. A ref keeps it pointing at the current
    // callback instead of a stale one.
    const onWorkspaceChangeRef = useRef(onWorkspaceChange);
    onWorkspaceChangeRef.current = onWorkspaceChange;
    const theme = useUIStore((s) => s.theme);
    const board = useEditorStore((s) => s.board);

    const [promptData, setPromptData] = React.useState<{
      message: string;
      defaultValue: string;
      callback: (result: string | null) => void;
    } | null>(null);
    const [promptValue, setPromptValue] = React.useState('');
    const [isEmpty, setIsEmpty] = React.useState(false);

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
          appliedFlyoutOffsetRef.current = 0;
          // Remove movable="false", deletable="false", and inline="true" from legacy block saves
          const cleanXml = xml
            .replace(/movable="false"/g, '')
            .replace(/deletable="false"/g, '')
            .replace(/inline="true"/g, '');

          // Blockly 11 removed Xml.textToDom — use the native DOMParser instead.
          const parser = new DOMParser();
          const doc = parser.parseFromString(cleanXml, 'text/xml');
          const dom = doc.documentElement;

          // Bulk-loading a workspace (project open, C++→Blocks conversion) is
          // not a user edit — suppress the change listener so it doesn't fire
          // for every block created and falsely mark the project dirty.
          Blockly.Events.disable();
          try {
            workspaceRef.current.clear();
            Blockly.Xml.domToWorkspace(dom, workspaceRef.current);

            // Loaded XML may carry a stale board title (e.g. C++→Blocks conversion
            // always emits "Arduino Program") — re-stamp it with the current board.
            const boardLabel = getBoardLabel(useEditorStore.getState().board);
            for (const block of workspaceRef.current.getBlocksByType('arduino_program')) {
              block.setFieldValue(`${boardLabel} Program`, 'TITLE');
            }
          } finally {
            Blockly.Events.enable();
          }
          setIsEmpty(workspaceRef.current.getAllBlocks(false).length === 0);
        } catch (err) {
          console.error('[loadXml error]', err);
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
      clearWorkspace() {
        if (!workspaceRef.current) return;
        // A real, user-initiated change (unlike the bulk-load path in loadXml) —
        // leave events enabled so the change listener marks the project dirty
        // and regenerates code/isEmpty state as usual.
        workspaceRef.current.clear();
      },
    }));

    const isInit = useRef(false);
    const appliedFlyoutOffsetRef = useRef<number>(0);

    // Resolve the UI theme setting (which may be 'system') to a concrete mode.
    const resolveMode = (currentTheme: string): 'light' | 'dark' => {
      if (currentTheme === 'dark') return 'dark';
      if (currentTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    };

    // Resolve which Blockly theme to use based on current UI theme setting
    const resolveBlocklyTheme = (currentTheme: string) =>
      resolveMode(currentTheme) === 'dark' ? darkKidTheme : kidTheme;

    // Initialize Blockly once the container div is mounted
    useEffect(() => {
      if (isInit.current || workspaceRef.current || !blocklyDiv.current) return;

      // Clear out any ghost DOM nodes from React 18 StrictMode unmounts
      blocklyDiv.current.innerHTML = '';
      isInit.current = true;
      appliedFlyoutOffsetRef.current = 0;

      // ── Ensure html.dark class matches the resolved Blockly theme BEFORE inject ──
      // Navbar's useEffect may not have fired yet on first render, so we sync it here.
      const initialMode = resolveMode(useUIStore.getState().theme);
      if (initialMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Mirror the same palette Blockly is about to be handed onto :root, so the
      // panels around the canvas render from identical values.
      applyEditorTokens(initialMode);

      // Set instant tooltip delay (100ms) for Blockly blocks
      (Blockly.Tooltip as any).HOVER_MS = 100;

      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox: getToolbox(engineMode),
        // Zelos is Blockly's Scratch-style renderer: rounded blocks, full
        // C-shape wrapping around nested statements — the kid-friendly look.
        renderer: 'zelos',
        theme: resolveBlocklyTheme(useUIStore.getState().theme),
        move: {
          scrollbars: true,
          drag: true,
          wheel: true,
        },
        grid: {
          spacing: 24,
          length: 3,
          colour: paletteFor(initialMode).gridDot,
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
        // Skip pure UI events (clicks, selection, drag start/end, viewport,
        // toolbox open, etc.) — Blockly flags these via isUiEvent so they
        // don't falsely mark the project dirty when nothing actually changed.
        if (event.isUiEvent) {
          return;
        }
        if (!workspaceRef.current) return;
        setIsEmpty(workspaceRef.current.getAllBlocks(false).length === 0);

        // Announce the edit first, and unconditionally. The C++ generation
        // below throws for Scratch blocks, and when it did the whole handler
        // bailed out — which is why the Scratch engine kept running a stale
        // copy of the script and edits to a "when [key] pressed" dropdown had
        // no effect until the green flag was pressed again.
        try {
          onWorkspaceChangeRef.current?.();
        } catch (e) {
          console.error('workspace change listener failed:', e);
        }

        try {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChange(code);
        } catch {
          // Expected in software mode: the Arduino generator has no handlers
          // for scratch_* blocks. The C++ preview is meaningless there anyway.
        }
      };

      workspaceRef.current.addChangeListener(onChange);

      /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

      // ── Improved flyout scroll compensation ────────────────────────────
      // Blockly's flyout is an absolute-positioned SVG overlay on the
      // workspace (by design — not custom code). When a category flyout
      // opens, we shift the workspace viewport by the flyout's measured
      // width so blocks near the left edge aren't occluded. When it
      // switches categories or closes, we adjust the shift dynamically.
      const syncFlyoutScrollOffset = (newItem?: any) => {
        const workspace = workspaceRef.current;
        if (!workspace) return;

        const flyout = workspace.getFlyout();
        const toolbox = workspace.getToolbox();
        const selectedItem =
          newItem !== undefined
            ? newItem
            : (toolbox as unknown as { getSelected?: () => unknown })?.getSelected?.();
        const isOpening = Boolean(selectedItem);

        const rawWidth = flyout ? flyout.getWidth() : 0;
        const targetWidth = isOpening ? (rawWidth > 0 ? rawWidth : 250) : 0;

        const delta = targetWidth - appliedFlyoutOffsetRef.current;
        if (delta !== 0) {
          workspace.scroll(workspace.scrollX + delta, workspace.scrollY);
          appliedFlyoutOffsetRef.current = targetWidth;
        }
        // Reposition zoom/trash controls to stay clear of flyout
        Blockly.svgResize(workspace);
      };

      const onToolboxSelect = (event: Blockly.Events.Abstract) => {
        if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
          const itemSelectEvent = event as any;
          syncFlyoutScrollOffset(itemSelectEvent.newItem);
          // Re-check after browser SVG layout pass in case block dimensions adjusted flyout width
          requestAnimationFrame(() => syncFlyoutScrollOffset(itemSelectEvent.newItem));
        }
      };
      /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
      workspaceRef.current.addChangeListener(onToolboxSelect);

      // Auto-place the root arduino_program block so users have setup()/loop()
      if (
        engineMode === 'hardware' &&
        workspaceRef.current.getBlocksByType('arduino_program').length === 0
      ) {
        const rootBlock = workspaceRef.current.newBlock('arduino_program');
        rootBlock.initSvg();
        rootBlock.render();
        rootBlock.moveBy(20, 20);

        // Set initial board title on the root block
        const initialBoard = useEditorStore.getState().board;
        rootBlock.setFieldValue(`${getBoardLabel(initialBoard)} Program`, 'TITLE');

        // Emit initial code from the root block
        try {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChange(code);
        } catch {
          onCodeChange('');
        }
      }

      setIsEmpty(workspaceRef.current.getAllBlocks(false).length === 0);

      // DO NOT put dispose() here to prevent strict mode from breaking global drag event listeners
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally runs once — workspace lifecycle is managed internally

    // Sync toolbox when engine mode changes
    useEffect(() => {
      if (!workspaceRef.current) return;
      workspaceRef.current.updateToolbox(getToolbox(engineMode));
      appliedFlyoutOffsetRef.current = 0;
      // Toolbox width may change between engines — recalculate SVG layout
      Blockly.svgResize(workspaceRef.current);
    }, [engineMode]);

    // Sync board changes to update the root block's title and re-generate code
    useEffect(() => {
      if (!workspaceRef.current) return;
      const blocks = workspaceRef.current.getBlocksByType('arduino_program');
      const boardLabel = getBoardLabel(board);
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

    // Sync theme changes — swap the Blockly theme and the :root CSS variables
    // together, from the same palette, so the canvas and the panels around it
    // can never disagree about what a surface looks like.
    useEffect(() => {
      applyEditorTokens(resolveMode(theme));
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

    // ResizeObserver — catches ALL container dimension changes (panel toggle,
    // window resize, resizer drag) and tells Blockly to recalculate its SVG.
    useEffect(() => {
      const el = blocklyDiv.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div ref={blocklyDiv} className="absolute inset-0" />

        {/* Friendly empty-canvas hint — clicks pass through to the workspace */}
        {isEmpty && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <img
                src="/sprites/svg.svg"
                alt=""
                className="w-24 h-28 mb-2 opacity-90 drop-shadow-lg animate-bounce"
                style={{ animationDuration: '2.5s' }}
              />
              <p className="font-sans font-bold text-lg text-ed-mid">Let&apos;s build something!</p>
              <p className="font-sans text-sm text-ed-mid max-w-xs">
                Pick a category on the left, then drag blocks onto this canvas to start coding.
              </p>
            </div>
          </div>
        )}

        {/* Custom dialog prompt modal for variable creation */}
        {promptData && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-ed-raised border border-ed-line rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-base font-semibold text-ed-hi font-sans mb-3">
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
                className="w-full bg-ed-well border border-ed-line rounded-xl px-4 py-2.5 text-sm text-ed-hi font-sans outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all mb-4"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    promptData.callback(null);
                    setPromptData(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ed-mid hover:text-ed-hi font-sans rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    promptData.callback(promptValue);
                    setPromptData(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 font-sans rounded-xl shadow-md shadow-primary-500/20 transition-all"
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
