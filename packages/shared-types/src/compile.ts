import type { CompileOutcome, Cuid, IsoTimestampString } from './common';

/** Request payload accepted by the compile endpoint. */
export interface CompileRequest {
  code: string;
  board: string;
  projectId?: Cuid;
}

/** Diagnostic emitted by the compiler. */
export interface CompileDiagnostic {
  line: number;
  column: number;
  message: string;
  type: 'error' | 'warning';
  raw?: string;
  friendlyMessage?: string;
}

/** Successful compile payload returned by the API. */
export interface CompileSuccessData {
  output: string;
  warnings: string[];
  compiledAt: IsoTimestampString;
  durationMs: number;
  binarySizeBytes?: number;
  board?: string;
}

/** Failure payload returned when compilation does not succeed. */
export interface CompileFailureData {
  code: 'COMPILE_ERROR' | 'COMPILE_TIMEOUT';
  message: string;
  details: CompileDiagnostic[];
  rawOutput?: string;
}

/** Session history entry shown in the console history tab. */
export interface CompileHistoryEntry {
  runNumber: number;
  outcome: Exclude<CompileOutcome, 'IDLE' | 'COMPILING'>;
  timestamp: IsoTimestampString;
}

/** Progress event used by the future SSE compile stream. */
export interface CompileProgressEvent {
  status: 'queued' | 'compiling' | 'complete';
  position?: number;
  progress?: number;
  result?: CompileSuccessData | CompileFailureData;
}

/** Store-level compile result union shared by the editor state. */
export type CompileResult = CompileSuccessData | CompileFailureData;
