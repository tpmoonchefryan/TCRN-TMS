import React, { useId } from 'react';

import { tokens } from '../foundations/tokens';
import { usePopoverListBehavior } from './popover-behavior';

export interface LocaleOption {
  code: string;
  label: string;
}

export interface LocaleSwitcherProps {
  locale: string;
  options: LocaleOption[];
  onChange: (localeCode: string) => void;
  ariaLabel: string;
}

export const LocaleSwitcher: React.FC<LocaleSwitcherProps> = ({
  locale,
  options,
  onChange,
  ariaLabel,
}) => {
  const {
    closePopover,
    containerRef,
    handleBlur,
    handleKeyDown,
    isExiting,
    isMounted,
    isOpen,
    popoverRef,
    togglePopover,
    triggerRef,
  } = usePopoverListBehavior({
    itemSelector: '[role="option"]',
    initialFocusSelector: '[aria-selected="true"], [role="option"]',
  });
  const triggerId = useId();

  const currentLabel = options.find((o) => o.code === locale)?.label || locale;
  const animationClass = isExiting ? tokens.motion.popoverExit : tokens.motion.popoverEnter;

  return (
    <div
      className={`relative inline-block text-left ${isOpen || isExiting ? 'z-50' : 'z-40'}`}
      ref={containerRef}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
        onClick={togglePopover}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{currentLabel}</span>
      </button>

      {isMounted && (
        <div
          ref={popoverRef}
          className={`absolute right-0 z-50 mt-2 w-40 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none ${animationClass} ${tokens.motion.reduced}`}
          role="listbox"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
        >
          <div className="py-1">
            {options.map((option) => {
              const isSelected = option.code === locale;
              return (
                <button
                  key={option.code}
                  onClick={() => { onChange(option.code); closePopover(); }}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm focus:outline-none focus:bg-slate-100 hover:bg-slate-100 focus-visible:bg-slate-100
                    ${isSelected ? 'text-indigo-600 font-bold' : 'text-slate-700 font-medium'}
                  `}
                >
                  {option.label}
                  {isSelected && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
