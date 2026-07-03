import { cppToBlocks } from './cpp-to-blocks';

self.onmessage = (event: MessageEvent<{ code: string }>) => {
  const { code } = event.data;
  try {
    const xml = cppToBlocks(code);
    console.log('[WORKER XML]', xml);
    self.postMessage({ success: true, xml });
  } catch (error: any) {
    self.postMessage({
      success: false,
      error: {
        message: error.message || 'Unknown parser error',
        line: error.line || 1,
        col: error.col || 1,
      },
    });
  }
};
