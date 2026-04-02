import type { CompileOutcome, IsoTimestampString } from './common';

/** Supported toast styles in the application shell. */
export type ToastVariant = 'success' | 'error' | 'warning' | 'special';

/** Shared toast notification shape. */
export interface ToastNotification {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  durationMs?: number;
  createdAt?: IsoTimestampString;
}

/** Known modal identifiers from the Phase 0 and Phase 1 product flows. */
export type ModalId =
  | 'NEW_PROJECT'
  | 'PROJECT_SETTINGS'
  | 'SETTINGS'
  | 'STREAK_DETAILS'
  | 'AVATAR_PICKER'
  | 'CONFIRMATION';

/** Confirmation dialog payload used before destructive actions. */
export interface ConfirmationDialog {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
}

/** Tabs rendered in the motivational console. */
export type ConsoleTab = 'OUTPUT' | 'QUICK_HINTS' | 'HISTORY';

/** Single console step used during animated compilation. */
export interface ConsoleStep {
  label: string;
  complete: boolean;
}

/** Quick hint card surfaced in the console hint library. */
export interface ConsoleHint {
  id: string;
  title: string;
  description: string;
  matchers?: string[];
}

/** Condensed session result used by the console UI. */
export interface ConsoleRunSummary {
  outcome: CompileOutcome;
  headline: string;
  body: string;
}
