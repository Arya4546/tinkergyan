import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => {
    const baseStyles =
      'font-sans font-semibold flex items-center justify-center gap-2 ' +
      'transition-all duration-150 cursor-pointer ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ' +
      'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]';

    const variants = {
      primary:
        'bg-primary-500 text-white rounded-xl hover:bg-primary-600 border border-primary-600',
      secondary:
        'bg-accent-500 text-slate-900 rounded-xl hover:bg-accent-400 border border-accent-600',
      outline:
        'bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 ' +
        'rounded-xl border border-slate-200 dark:border-dark-border ' +
        'hover:bg-slate-50 dark:hover:bg-dark-border',
      ghost:
        'border-transparent bg-transparent rounded-xl text-slate-600 dark:text-slate-400 ' +
        'hover:bg-slate-100 dark:hover:bg-dark-border',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
