import { type RefObject, useEffect, useRef } from 'react';

let bodyLockDepth = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    if (element.hasAttribute('hidden')) {
      return false;
    }

    return element.tabIndex >= 0;
  });
}

function focusElement(element: HTMLElement | null | undefined) {
  if (!element) {
    return;
  }

  element.focus({ preventScroll: true });
}

function lockBodyScroll() {
  if (bodyLockDepth === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }
  }

  bodyLockDepth += 1;

  return () => {
    bodyLockDepth = Math.max(0, bodyLockDepth - 1);

    if (bodyLockDepth === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    }
  };
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    return lockBodyScroll();
  }, [active]);
}

export interface ModalFocusOptions {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

export function useModalFocus({
  active,
  containerRef,
  initialFocusRef,
  restoreFocus = true,
}: ModalFocusOptions) {
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusableElements = getFocusableElements(container);
      focusElement(initialFocusRef?.current ?? focusableElements[0] ?? container);
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusElement(container);
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        focusElement(lastFocusable);
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        focusElement(firstFocusable);
        return;
      }

      if (!container.contains(activeElement)) {
        event.preventDefault();
        focusElement(firstFocusable);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);

      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      if (restoreFocus && previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
        focusElement(previouslyFocusedElement);
      }
      previouslyFocusedElementRef.current = null;
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}
