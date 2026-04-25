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

Blockly.setLocale(En as any);

// ─── Public ref handle ────────────────────────────────────────────────────────
export interface BlocklyWorkspaceHandle {
  /** Serialize the current workspace to an XML string. */
  getXml: () => string;
  /** Deserialize an XML string into the workspace (replaces current state). */
  loadXml: (xml: string) => void;
  /** Return the current generated C++ code without triggering onCodeChange. */
  getCode: () => string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BlocklyWorkspaceProps {
  onCodeChange: (code: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(
  ({ onCodeChange, className = '' }, ref) => {
    const blocklyDiv   = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const theme        = useUIStore((s: any) => s.theme);

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
          // Blockly 11 removed Xml.textToDom — use the native DOMParser instead.
          const parser = new DOMParser();
          const doc    = parser.parseFromString(xml, 'text/xml');
          const dom    = doc.documentElement;
          Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
        } catch {
          // Ignore malformed XML — workspace stays as-is
        }
      },
      getCode() {
        if (!workspaceRef.current) return '';
        return arduinoGenerator.workspaceToCode(workspaceRef.current);
      },
    }));

    // Initialize Blockly once the container div is mounted
    useEffect(() => {
      if (workspaceRef.current || !blocklyDiv.current) return;

      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox: INITIAL_TOOLBOX,
        theme:   Blockly.Themes.Classic,
        grid: {
          spacing: 20,
          length:  3,
          colour:  theme === 'dark' ? '#333' : '#ccc',
          snap:    true,
        },
        zoom: {
          controls:   true,
          wheel:      true,
          startScale: 1.0,
          maxScale:   3,
          minScale:   0.3,
          scaleSpeed: 1.2,
        },
        trashcan: true,
      });

      const onChange = (event: Blockly.Events.Abstract) => {
        // Skip pure UI events that don't affect code
        if (
          event.type === Blockly.Events.VIEWPORT_CHANGE ||
          event.type === Blockly.Events.THEME_CHANGE ||
          event.type === Blockly.Events.BUBBLE_OPEN ||
          event.type === Blockly.Events.TRASHCAN_OPEN
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
      // Emit empty code on mount so parent state is initialized
      onCodeChange('');

      return () => {
        workspaceRef.current?.dispose();
        workspaceRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally runs once — workspace lifecycle is managed internally

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
  }
);

BlocklyWorkspace.displayName = 'BlocklyWorkspace';
