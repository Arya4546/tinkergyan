// Tests run in Node: 'blockly/core' resolves to a CommonJS build there, so
// re-export the ESM entry, which shares the same Blockly instance.
export * from 'blockly';
