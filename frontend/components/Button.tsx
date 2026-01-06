'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Button styles matching app_spec.txt design system with theme-aware colors (F80)
const variantStyles: Record<ButtonVariant, string> = {
  // Primary: bg-blue-600 hover:bg-blue-700, text-white font-medium, rounded-lg px-4 py-2, transition-colors duration-200
  primary:
    'bg-accent-primary hover:bg-accent-hover text-white font-medium disabled:bg-accent-primary/50 disabled:hover:bg-accent-primary/50',
  // Secondary: theme-aware border and hover states
  secondary:
    'border border-theme hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary',
  // Ghost: theme-aware hover states
  ghost:
    'bg-transparent hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary',
  // Danger variant
  danger:
    'bg-red-500 hover:bg-red-600 text-white font-medium disabled:bg-red-500/50',
  // Icon: theme-aware hover states
  icon:
    'bg-transparent hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary rounded-full w-10 h-10 flex items-center justify-center p-0',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 ease-in-out',
          // F90: Enhanced focus states for accessibility - visible focus ring with proper offset
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-(--color-bg-primary)',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Apply rounded-lg for non-icon buttons, icon uses rounded-full from variantStyles
          variant !== 'icon' && 'rounded-lg',
          variantStyles[variant],
          variant !== 'icon' && sizeStyles[size],
          className
        )}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
