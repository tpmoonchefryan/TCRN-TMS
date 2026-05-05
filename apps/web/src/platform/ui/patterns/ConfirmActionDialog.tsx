import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { motionConstants, tokens } from '../foundations/tokens';
import { useBodyScrollLock, useModalFocus } from './overlay-behavior';

export interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  title: string;
  description: React.ReactNode;
  confirmText: string;
  pendingText?: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  intent?: 'danger' | 'primary';
  isPending?: boolean;
}

export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  open,
  onOpenChange,
  onCancel,
  title,
  description,
  confirmText,
  pendingText = confirmText,
  cancelText,
  onConfirm,
  intent = 'primary',
  isPending: externalIsPending = false,
}) => {
  const titleId = useId();
  const descId = useId();
  const [internalIsPending, setInternalIsPending] = useState(false);
  const isPending = externalIsPending || internalIsPending;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  
  // Presence helper
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (open && !isMounted) {
      setIsMounted(true);
    }
  }, [open, isMounted]);

  useEffect(() => {
    if (!open && isMounted) {
      setIsExiting(true);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Match duration-[150ms] from dialogExit token
      const timeout = reducedMotion ? 0 : motionConstants.durationQuickMs; 
      
      const timer = setTimeout(() => {
        setIsExiting(false);
        setIsMounted(false);
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [open, isMounted]);

  const handleCancel = () => {
    if (isPending) {
      return;
    }

    if (onCancel) onCancel();
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    if (!isMounted || (!open && !isExiting)) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMounted, open, isExiting, isPending, onOpenChange, onCancel]);

  useBodyScrollLock(isMounted && (open || isExiting));
  useModalFocus({
    active: isMounted && open,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
  });

  if (!isMounted) return null;

  const handleConfirm = async () => {
    setInternalIsPending(true);
    try {
      await onConfirm();
      if (onOpenChange) onOpenChange(false);
    } finally {
      setInternalIsPending(false);
    }
  };

  const isDanger = intent === 'danger';
  const confirmBtnClass = isDanger
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white';

  const animationClass = isExiting ? tokens.motion.dialogExit : tokens.motion.dialogEnter;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div 
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity ${isExiting ? 'opacity-0 duration-150 ease-in' : 'opacity-100 duration-200 ease-out'} ${tokens.motion.reduced}`}
        aria-hidden="true" 
        onClick={() => !isPending && handleCancel()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`relative w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 text-left shadow-2xl ${animationClass} ${tokens.motion.reduced}`}
      >
        <div className="mb-6">
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <div id={descId} className="mt-2 text-sm text-slate-500">
            {description}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50"
            onClick={handleCancel}
            disabled={isPending}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto disabled:opacity-50 ${confirmBtnClass}`}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? pendingText : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
