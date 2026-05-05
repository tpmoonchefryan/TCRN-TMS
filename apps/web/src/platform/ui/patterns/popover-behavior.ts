import { type FocusEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { motionConstants } from '../foundations/tokens';

interface UsePopoverListBehaviorOptions {
  itemSelector: string;
  initialFocusSelector?: string;
  exitDurationMs?: number;
}

export function usePopoverListBehavior({
  itemSelector,
  initialFocusSelector = itemSelector,
  exitDurationMs = motionConstants.durationPopoverMs,
}: UsePopoverListBehaviorOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const focusTimerRef = useRef<number | null>(null);

  const openPopover = useCallback(() => {
    setIsOpen(true);
    setIsMounted(true);
    setIsExiting(false);
  }, []);

  const closePopover = useCallback(() => {
    if (!isOpen) {
      return;
    }

    setIsOpen(false);
    setIsExiting(true);
  }, [isOpen]);

  const togglePopover = useCallback(() => {
    if (isOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }, [closePopover, isOpen, openPopover]);

  useEffect(() => {
    if (!isExiting) {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeout = reducedMotion ? 0 : exitDurationMs;
    const timer = window.setTimeout(() => {
      setIsExiting(false);
      setIsMounted(false);
    }, timeout);

    return () => window.clearTimeout(timer);
  }, [exitDurationMs, isExiting]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closePopover();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [closePopover, isOpen]);

  useEffect(() => {
    if (isOpen && popoverRef.current) {
      focusTimerRef.current = window.setTimeout(() => {
        const initialItem = popoverRef.current?.querySelector(initialFocusSelector) as HTMLElement | null;
        const firstItem = popoverRef.current?.querySelector(itemSelector) as HTMLElement | null;
        (initialItem ?? firstItem)?.focus();
      }, 0);
    }

    return () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [initialFocusSelector, isOpen, itemSelector]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) {
      return;
    }

    const items = Array.from(popoverRef.current?.querySelectorAll(itemSelector) ?? []) as HTMLElement[];
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();

      if (items.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        const nextIndex = (index + 1) % items.length;
        items[nextIndex]?.focus();
      } else if (event.key === 'ArrowUp') {
        const previousIndex = (index - 1 + items.length) % items.length;
        items[previousIndex]?.focus();
      } else if (event.key === 'Home') {
        items[0]?.focus();
      } else {
        items[items.length - 1]?.focus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePopover();
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      closePopover();
    }
  }, [closePopover, isOpen, itemSelector]);

  const handleBlur = useCallback((event: FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.relatedTarget as Node)) {
      closePopover();
    }
  }, [closePopover]);

  return {
    closePopover,
    containerRef,
    handleBlur,
    handleKeyDown,
    isExiting,
    isMounted,
    isOpen,
    openPopover,
    popoverRef,
    togglePopover,
    triggerRef,
  };
}
