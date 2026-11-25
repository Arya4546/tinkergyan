// Loads blocks-env.mjs through Vite, which handles the TypeScript sources, the
// extension-less imports and Blockly's Node build.
import { runnerImport } from 'vite';
const root = new URL('../..', import.meta.url).pathname;
const { module } = await runnerImport(new URL('./blocks-env.mjs', import.meta.url).pathname, {
  root,
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { 'blockly/core': new URL('./blockly-core.mjs', import.meta.url).pathname } },
});
export const {
  Blockly,
  pythonToBlocks,
  ConvertError,
  jsonToPython,
  xmlToPython,
  xmlBlockTypes,
  setBoard,
  setAiLabels,
} = module;
