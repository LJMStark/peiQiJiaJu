import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type StatusTone = 'info' | 'success' | 'warning' | 'error';

type StatusNoticeProps = {
  tone?: StatusTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

const toneClassNames: Record<StatusTone, string> = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-800',
};

const toneIcons: Record<StatusTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function StatusNotice({
  tone = 'info',
  title,
  children,
  action,
  className = '',
}: StatusNoticeProps) {
  const Icon = toneIcons[tone];
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <div role={role} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${toneClassNames[tone]} ${className}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm leading-6">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
