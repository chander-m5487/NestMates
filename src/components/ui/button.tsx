import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600 shadow-md hover:shadow-lg',
        destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
        outline: 'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 shadow-md',
        accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-md',
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        link: 'text-primary-500 underline-offset-4 hover:underline',
        gradient: 'bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 text-white hover:opacity-90 shadow-md',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-md px-4 text-sm',
        lg: 'h-14 rounded-lg px-8 text-lg',
        xl: 'h-16 rounded-xl px-10 text-xl',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
