import type { HTMLAttributes, ReactNode } from 'react';

type PanelPadding = 'none' | 'compact' | 'default';

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  padding?: PanelPadding;
  children: ReactNode;
};

const paddingClassNames: Record<PanelPadding, string> = {
  none: '',
  compact: 'p-4',
  default: 'p-4 sm:p-6',
};

export function Panel({ padding = 'default', className = '', children, ...props }: PanelProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-zinc-200 bg-white ${paddingClassNames[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
