import { useEffect, useRef } from 'react';

export function useOverlayFocusManager({
  desktopBreakpoint = 1280,
  open,
  onClose,
}: Readonly<{
  desktopBreakpoint?: number;
  onClose: () => void;
  open: boolean;
}>) {
  const openerRef = useRef<HTMLElement | null>(null);
  const fallbackTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopInitialFocusRef = useRef<HTMLButtonElement | null>(null);
  const mobileInitialFocusRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        (openerRef.current ?? fallbackTriggerRef.current)?.focus();
      }

      return;
    }

    wasOpenRef.current = true;

    const focusTimer = window.setTimeout(() => {
      const prefersDesktopFocus = typeof window !== 'undefined'
        ? window.innerWidth >= desktopBreakpoint
        : true;
      const target = prefersDesktopFocus
        ? desktopInitialFocusRef.current ?? mobileInitialFocusRef.current
        : mobileInitialFocusRef.current ?? desktopInitialFocusRef.current;

      target?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopBreakpoint, onClose, open]);

  const registerTrigger = (target: EventTarget | null) => {
    if (target instanceof HTMLElement) {
      openerRef.current = target;
    }
  };

  return {
    desktopInitialFocusRef,
    fallbackTriggerRef,
    mobileInitialFocusRef,
    registerTrigger,
  };
}
