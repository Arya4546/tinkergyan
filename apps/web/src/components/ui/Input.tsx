import { InputHTMLAttributes, forwardRef } from 'react';
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
          <label className="block font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`flex h-12 w-full hw-border bg-slate-50 dark:bg-[#111111] px-4 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-500 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:focus:bg-[#000000] disabled:cursor-not-allowed disabled:opacity-50 pr-10 ${
              error ? 'border-red-500 focus:border-red-500 bg-red-500/5' : isValid ? 'border-emerald-500 focus:border-emerald-500 bg-emerald-500/5' : ''
            } ${className}`}
            {...props}
          />
          {isValid && !error && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-emerald-500">
              <CheckCircle2 size={16} strokeWidth={2} />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-[10px] font-bold font-mono uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 inline-block">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
