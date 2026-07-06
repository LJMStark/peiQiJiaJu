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
  const closeOnEscapeRef = useRef(closeOnEscape);
  const isDismissDisabledRef = useRef(isDismissDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
    isDismissDisabledRef.current = isDismissDisabled;
  }, [onClose, closeOnEscape, isDismissDisabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !closeOnEscapeRef.current || isDismissDisabledRef.current) {
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
  }, [initialFocusRef, isOpen, lockScroll]);

  return dialogRef;
}
