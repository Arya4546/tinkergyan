/**
 * Shared TypeScript types for compile results.
 * Mirrors the CompileResult / CompileError interfaces in apps/api/src/lib/compiler.ts.
 */
export interface CompileError {
  /** 1-based line number. 0 = unknown. */
  line:     number;
  column:   number;
  message:  string;
  severity: 'error' | 'warning';
}

export interface CompileResult {
  success:    boolean;
  stdout:     string;
  stderr:     string;
  errors:     CompileError[];
  durationMs: number;
  /** Which compilation engine was used. */
  engine:     'wandbox' | 'arduino' | 'mock';
}
