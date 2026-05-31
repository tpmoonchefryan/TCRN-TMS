import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { motionConstants, tokens } from '../foundations/tokens';
import { useBodyScrollLock, useModalFocus } from './overlay-behavior';

export interface ActionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeButtonAriaLabel: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ActionDrawerFooterProps {
  secondary?: React.ReactNode;
  primary?: React.ReactNode;
  destructive?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const ActionDrawerFooter: React.FC<ActionDrawerFooterProps> = ({
  secondary,
  primary,
  destructive,
  children,
  className = '',
}) => {
  if (children) {
    return (
      <div
        className={`flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end ${className}`}
    >
      {secondary}
      {destructive || primary}
    </div>
  );
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full sm:max-w-[calc(100vw-2rem)]',
};

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeButtonAriaLabel,
  initialFocusRef,
  restoreFocus = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const titleId = useId();
  const descId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Presence helper logic
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Mount on first open
  useEffect(() => {
    if (open && !isMounted) {
      setIsMounted(true);
    }
  }, [open, isMounted]);

  // Handle exit choreography
  useEffect(() => {
    if (!open && isMounted) {
      setIsExiting(true);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timeout = reducedMotion ? 0 : motionConstants.durationHeroMs; // Must match duration-300

      const timer = setTimeout(() => {
        setIsExiting(false);
        setIsMounted(false);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [open, isMounted]);

  useEffect(() => {
    if (!open && !isExiting) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onOpenChange, open, isExiting]);

  useBodyScrollLock(isMounted && (open || isExiting));
  useModalFocus({
    active: isMounted && open,
    containerRef: drawerRef,
    initialFocusRef,
    restoreFocus,
  });

  if (!isMounted) {
    return null;
  }

  const animationClass = isExiting ? tokens.motion.drawerExit : tokens.motion.drawerEnter;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => {
          if (closeOnBackdropClick) {
            onOpenChange(false);
          }
        }}
        className={`absolute inset-0 border-0 bg-slate-900/55 p-0 backdrop-blur-sm ${isExiting ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'} ${tokens.motion.reduced}`}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 flex h-[100dvh] w-full justify-end overflow-hidden">
        <div
          ref={drawerRef}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className={`relative flex h-[100dvh] max-h-[100dvh] w-full ${sizeClasses[size]} flex-col overflow-hidden border-l ${tokens.colors.border} ${tokens.colors.surface} shadow-2xl ${animationClass} ${tokens.motion.reduced}`}
        >
          <header className="flex flex-none items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div className="min-w-0 space-y-1">
              <h2 id={titleId} className={`text-xl font-bold break-words ${tokens.colors.text}`}>
                {title}
              </h2>
              {description ? (
                <p id={descId} className={`text-sm break-words ${tokens.colors.textMuted}`}>
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={closeButtonAriaLabel}
            >
              <svg
                className="h-5 w-5"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            {children}
          </div>

          {footer ? (
            <footer className="flex flex-none items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex w-full justify-end">{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
