// Loads hardware-env.mjs through Vite, which handles the TypeScript sources, the
// extension-less imports and Blockly's Node build.
import { runnerImport } from 'vite';
const root = new URL('../..', import.meta.url).pathname;
const { module } = await runnerImport(new URL('./hardware-env.mjs', import.meta.url).pathname, {
  root,
  configFile: false,
  logLevel: 'error',
  resolve: {
    alias: { 'blockly/core': new URL('../python/blockly-core.mjs', import.meta.url).pathname },
  },
});
export const {
  Blockly,
  cppToBlocks,
  getToolbox,
  setBoard,
  jsonToCpp,
  xmlToCpp,
  jsonToSim,
  xmlBlockTypes,
  analogWriteWarning,
} = module;
