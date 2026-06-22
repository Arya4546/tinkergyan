/**
 * BlocklyWorkspace.tsx
 *
 * Renders the Blockly block editor canvas.
 * - Imports custom Arduino block definitions and the C++ generator.
 * - Exposes getXml() and loadXml() via ref for save/load.
 * - Reports generated C++ on every workspace change via onCodeChange.
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';

// Custom Arduino extensions — must be imported before inject()
import './arduino-blocks';
import { arduinoGenerator } from './arduino-generator';
import { INITIAL_TOOLBOX } from './toolbox';
import { useUIStore } from '../../stores/ui.store';
import { useEditorStore } from '../../stores/editor.store';

Blockly.setLocale(En as unknown as Record<string, string>);

const BOARDS = [
  { fqbn: 'arduino:avr:uno', label: 'Arduino Uno' },
  { fqbn: 'arduino:avr:mega', label: 'Arduino Mega' },
  { fqbn: 'esp8266:esp8266:nodemcuv2', label: 'NodeMCU (ESP8266)' },
] as const;

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

    // Initialize Blockly once the container div is mounted
    useEffect(() => {
      if (isInit.current || workspaceRef.current || !blocklyDiv.current) return;

      // Clear out any ghost DOM nodes from React 18 StrictMode unmounts
      blocklyDiv.current.innerHTML = '';
      isInit.current = true;

      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox: INITIAL_TOOLBOX,
        theme: Blockly.Themes.Classic,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true,
        },
        grid: {
          spacing: 20,
          length: 3,
          colour: theme === 'dark' ? '#333' : '#ccc',
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

    // Sync board changes to update the root block's title dynamically
    useEffect(() => {
      if (!workspaceRef.current) return;
      const blocks = workspaceRef.current.getBlocksByType('arduino_program');
      const boardLabel = BOARDS.find((b) => b.fqbn === board)?.label || 'Arduino';
      for (const block of blocks) {
        block.setFieldValue(`${boardLabel} Program`, 'TITLE');
      }
    }, [board]);

    // Sync theme changes without re-mounting the workspace
    useEffect(() => {
      if (!workspaceRef.current) return;
      workspaceRef.current.setTheme(Blockly.Themes.Classic);
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
      </div>
    );
  },
);

BlocklyWorkspace.displayName = 'BlocklyWorkspace';
