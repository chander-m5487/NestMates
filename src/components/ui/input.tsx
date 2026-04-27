import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-14 w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-lg text-gray-900 transition-all duration-200',
            'file:border-0 file:bg-transparent file:text-lg file:font-medium',
            'placeholder:text-gray-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            'hover:border-gray-400',
            icon && 'pl-12',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-base text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
