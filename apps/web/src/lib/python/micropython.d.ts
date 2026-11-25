// The MicroPython WebAssembly package ships plain JS with no type declarations.
declare module '@micropython/micropython-webassembly-pyscript' {
  export interface MicroPythonInstance {
    runPython(code: string): unknown;
    registerJsModule(name: string, module: Record<string, unknown>): void;
  }
  export function loadMicroPython(options?: {
    url?: string;
    heapsize?: number;
    pystack?: number;
    linebuffer?: boolean;
    stdout?: (data: string | Uint8Array) => void;
    stderr?: (data: string | Uint8Array) => void;
  }): Promise<MicroPythonInstance>;
}
