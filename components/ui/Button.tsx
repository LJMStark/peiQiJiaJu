'use client';

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'compact' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  ariaLabel?: string;
  children?: ReactNode;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'border-zinc-900 bg-zinc-900 text-white hover:border-zinc-800 hover:bg-zinc-800',
  secondary: 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50',
  ghost: 'border-transparent bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50',
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: 'min-h-11 px-4 py-2.5 text-sm',
  compact: 'min-h-9 px-3 py-1.5 text-sm',
  icon: 'h-11 w-11 p-0',
};

export function Button({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  loadingLabel = '处理中...',
  ariaLabel,
  'aria-label': nativeAriaLabel,
  className = '',
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={ariaLabel ?? nativeAriaLabel}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`}
    >
      {isLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
      {isLoading ? loadingLabel : children}
    </button>
  );
}
