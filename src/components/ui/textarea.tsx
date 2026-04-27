import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div>
        <textarea
          className={cn(
            'flex min-h-[140px] w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-lg text-gray-900 transition-all duration-200 leading-relaxed',
            'placeholder:text-gray-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            'hover:border-gray-400',
            'resize-none',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-base text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
