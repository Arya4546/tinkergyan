// Loaded by tests through Vite (see hardware.mjs), which resolves the .ts imports: the real
// hardware block definitions, the C++ and simulator generators and "Convert to blocks".
import * as Blockly from 'blockly/core';
import '../../src/components/editor/arduino-blocks';
import { arduinoGenerator, servoTimerWarning } from '../../src/components/editor/arduino-generator';
import { workspaceToArduinoSimCode } from '../../src/components/editor/arduino-sim-generator';
import { cppToBlocks } from '../../src/lib/cpp-to-blocks';
import { useEditorStore } from '../../src/stores/editor.store';

export { Blockly, cppToBlocks };
export { getToolbox } from '../../src/components/editor/toolbox';

function withWorkspace(fill, read) {
  const ws = new Blockly.Workspace();
  try {
    fill(ws);
    return read(ws);
  } finally {
    ws.dispose();
  }
}

const loadJson = (state) => (ws) => Blockly.serialization.workspaces.load(state, ws);
const loadXml = (xml) => (ws) => Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);

/** The hardware project's board (an FQBN such as 'arduino:avr:uno'). */
export function setBoard(board) {
  useEditorStore.setState({ board });
}

/** C++ for a Blockly JSON program, as the editor shows it. */
export const jsonToCpp = (state) =>
  withWorkspace(loadJson(state), (ws) => arduinoGenerator.workspaceToCode(ws));

/** C++ for saved blocks (XML). */
export const xmlToCpp = (xml) =>
  withWorkspace(loadXml(xml), (ws) => arduinoGenerator.workspaceToCode(ws));

/** The simulator's JavaScript for a Blockly JSON program. */
export const jsonToSim = (state) => withWorkspace(loadJson(state), workspaceToArduinoSimCode);

/** The block types in saved blocks (XML), in order. */
export const xmlBlockTypes = (xml) =>
  withWorkspace(loadXml(xml), (ws) => ws.getAllBlocks(true).map((b) => b.type));

/** The servo-timer warning the first analogWrite block in a program would show. */
export const analogWriteWarning = (state) =>
  withWorkspace(loadJson(state), (ws) => {
    const block = ws.getBlocksByType('arduino_analog_write', true)[0];
    return servoTimerWarning(block, block.getFieldValue('PIN'));
  });
