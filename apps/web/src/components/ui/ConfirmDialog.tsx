/**
 * ConfirmDialog.tsx
 *
 * Reusable confirmation modal for destructive actions.
 * Hardware-brutalist aesthetic, keyboard accessible.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     title="DELETE_PROJECT"
 *     message="This action is irreversible."
 *     confirmLabel="DELETE"
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowDelete(false)}
 *     variant="danger"
 *   />
 */
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open:         boolean;
  title:        string;
  message:      string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:     'danger' | 'default';
  onConfirm:    () => void;
  onCancel:     () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open + handle Escape
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#111111] hw-border max-w-sm w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 hw-border-b flex items-center gap-3 ${isDanger ? 'bg-red-500/5' : ''}`}>
          {isDanger && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
          <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="font-mono text-xs text-slate-500 uppercase tracking-wider leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 hw-border-t flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-10 px-5 hw-key bg-white dark:bg-[#000000] text-slate-900 dark:text-white border border-slate-900 dark:border-slate-800 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-10 px-5 hw-key font-mono text-[10px] font-bold uppercase tracking-widest ${
              isDanger
                ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:border-white dark:hover:bg-slate-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
