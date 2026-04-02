import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'hw-key focus:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'hw-key-primary',
      secondary: 'bg-emerald-500 text-slate-900 border-slate-900 hover:bg-slate-900 hover:text-white',
      outline: 'bg-white dark:bg-[#000000] text-slate-900 dark:text-white border-slate-900 dark:border-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900',
      ghost: 'border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
    };
    
    const sizes = {
      sm: 'h-8 px-4 text-xs',
      md: 'h-12 px-6 title-[10px]',
      lg: 'h-16 px-8 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
