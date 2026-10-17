/**
 * ConfirmDialog.tsx
 *
 * Reusable confirmation modal for destructive actions.
 * Matches the rest of the app's look (rounded-3xl cards, soft shadows,
 * the same purple/red accents as NewProjectDialog and the project cards),
 * keyboard accessible.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     title="Delete Project"
 *     message="This action is irreversible."
 *     confirmLabel="Delete"
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowDelete(false)}
 *     variant="danger"
 *   />
 */
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
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
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#15152b] border border-slate-200 dark:border-white/10 rounded-3xl max-w-sm w-full shadow-2xl p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          {isDanger && (
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-10 px-5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-10 px-5 rounded-xl text-sm font-bold text-white transition-all shadow-sm ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
