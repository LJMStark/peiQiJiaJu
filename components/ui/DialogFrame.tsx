'use client';

import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useDialogAccessibility } from '@/components/use-dialog-accessibility';
import { Button } from './Button';

type DialogFrameProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  isDismissDisabled?: boolean;
  className?: string;
};

export function DialogFrame({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  isDismissDisabled = false,
  className = '',
}: DialogFrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogAccessibility<HTMLDivElement>({
    isOpen,
    onClose,
    isDismissDisabled,
    lockScroll: true,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !isDismissDisabled) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">{title}</h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            ariaLabel="关闭弹窗"
            onClick={onClose}
            disabled={isDismissDisabled}
            className="-mr-2 -mt-2 shrink-0"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
