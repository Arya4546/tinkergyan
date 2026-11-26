// Loaded by tests through Vite (see blocks.mjs), which resolves the .ts imports: the real block definitions,
// Python generators and "Convert to blocks", with a headless workspace.
import * as Blockly from 'blockly/core';
import { workspaceToPython } from '../../src/components/editor/python-blocks';
import '../../src/components/editor/python-board-blocks';
import { pythonToBlocks, ConvertError } from '../../src/lib/python/python-to-blocks';
import { useEditorStore } from '../../src/stores/editor.store';
import { useAIStore } from '../../src/stores/ai.store';

export { Blockly, pythonToBlocks, ConvertError };

function withWorkspace(fill, read) {
  const ws = new Blockly.Workspace();
  try {
    fill(ws);
    return read(ws);
  } finally {
    ws.dispose();
  }
}

/** Python for a Blockly JSON program, made by the same generators the editor uses. */
export function jsonToPython(state) {
  return withWorkspace((ws) => Blockly.serialization.workspaces.load(state, ws), workspaceToPython);
}

/** Python for saved blocks (XML), as the editor would show it. */
export function xmlToPython(xml) {
  return withWorkspace(
    (ws) => Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws),
    workspaceToPython,
  );
}

/** The block types in saved blocks (XML), in order. */
export function xmlBlockTypes(xml) {
  return withWorkspace(
    (ws) => Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws),
    (ws) => ws.getAllBlocks(true).map((b) => b.type),
  );
}

/** The project's board ('python' = the browser, 'python-esp32' …). */
export function setBoard(board) {
  useEditorStore.setState({ board });
}

/** The classes of the AI model trained in AI Studio. */
export function setAiLabels(labels) {
  useAIStore.setState({ classLabels: labels });
}

export { boardExamples, aiExamples } from '../../src/lib/python/board-examples';
export { getToolbox } from '../../src/components/editor/toolbox';

/** Python for one toolbox entry, loaded the way the flyout loads it. */
export function toolboxEntryToPython(entry) {
  const state = { ...entry };
  delete state.kind;
  return withWorkspace((ws) => Blockly.serialization.blocks.append(state, ws), workspaceToPython);
}
