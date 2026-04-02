import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';
import { javascriptGenerator } from 'blockly/javascript'; // We'll use JS as a stand-in for C++ until we build the Arduino generator
import { INITIAL_TOOLBOX } from './toolbox';
import { useUIStore } from '../../stores/ui.store';

Blockly.setLocale(En);

interface BlocklyWorkspaceProps {
  onCodeChange: (code: string) => void;
  className?: string;
}

export const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({ onCodeChange, className = '' }) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const theme = useUIStore((s: any) => s.theme);

  useEffect(() => {
    // Only initialize if we haven't already and the div is ready
    if (workspaceRef.current || !blocklyDiv.current) return;

    const blocklyTheme = theme === 'dark' ? Blockly.Themes.Dark : Blockly.Themes.Classic;

    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox: INITIAL_TOOLBOX,
      theme: blocklyTheme,
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
      trashcan: false,
    });

    const onWorkspaceChange = (event: any) => {
      // Don't trigger on UI events to avoid lag
      if (
        event.type === Blockly.Events.UI ||
        event.type === Blockly.Events.THEME_CHANGE ||
        event.type === Blockly.Events.BUBBLE_OPEN
      ) {
        return;
      }

      if (workspaceRef.current) {
        // Generate pseudo-code representing the structure
        const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
        onCodeChange(code);
      }
    };

    workspaceRef.current.addChangeListener(onWorkspaceChange);

    // Initial trigger
    onCodeChange('');

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
      workspaceRef.current = null;
    };
  }, []); // Run absolutely once.

  // Handle Theme Switching externally cleanly
  useEffect(() => {
    if (workspaceRef.current) {
      if (theme === 'dark') {
        workspaceRef.current.setTheme(Blockly.Themes.Dark);
      } else {
        workspaceRef.current.setTheme(Blockly.Themes.Classic);
      }
    }
  }, [theme]);

  // Handle window resizing cleanly
  useEffect(() => {
    const handleResize = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={blocklyDiv} className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
};
