import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-5 py-10 text-center ${className}`}>
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
