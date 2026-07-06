'use client';

import { type RefObject, useEffect, useRef } from 'react';

type UseDialogAccessibilityOptions = {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  isDismissDisabled?: boolean;
  lockScroll?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function useDialogAccessibility<T extends HTMLElement>({
  isOpen,
  onClose,
  closeOnEscape = true,
  isDismissDisabled = false,
  lockScroll = false,
  initialFocusRef,
}: UseDialogAccessibilityOptions) {
  const dialogRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !closeOnEscape || isDismissDisabled) {
        return;
      }

      event.preventDefault();
      onCloseRef.current();
    };

    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    document.addEventListener('keydown', handleKeyDown);
    const frameId = window.requestAnimationFrame(() => {
      const focusTarget =
        initialFocusRef?.current
        ?? dialogRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        ?? dialogRef.current;
      focusTarget?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = previousBodyOverflow;
      }
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus({ preventScroll: true });
      }
    };
  }, [closeOnEscape, initialFocusRef, isDismissDisabled, isOpen, lockScroll]);

  return dialogRef;
}
