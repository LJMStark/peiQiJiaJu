import type { HTMLAttributes, ReactNode } from 'react';

type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  children: ReactNode;
};

export function Toolbar({ label, className = '', children, ...props }: ToolbarProps) {
  return (
    <div
      {...props}
      role="toolbar"
      aria-label={label}
      className={`flex min-h-11 flex-wrap items-center gap-2 ${className}`}
    >
      {children}
    </div>
  );
}
