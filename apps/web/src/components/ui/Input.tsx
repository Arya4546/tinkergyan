import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  isValid?: boolean | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, isValid, ...props }, ref) => {
    return (
      <div className="w-full relative">
        {label && (
          <label className="block font-sans text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`flex h-12 w-full rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-2 font-sans text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 pr-10 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10'
                : isValid
                  ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : ''
            } ${className}`}
            {...props}
          />
          {isValid && !error && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-emerald-500">
              <CheckCircle2 size={16} strokeWidth={2} />
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs font-sans font-medium text-red-500 px-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
