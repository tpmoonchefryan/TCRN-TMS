import React, { useEffect, useId, useRef, useState } from 'react';

import { motionConstants, tokens } from '../foundations/tokens';

export interface LocaleOption {
  code: string;
  label: string;
}

export interface LocaleSwitcherProps {
  currentLocale: string;
  options: LocaleOption[];
  onChange: (localeCode: string) => void;
  ariaLabelPrefix?: string;
}

export const LocaleSwitcher: React.FC<LocaleSwitcherProps> = ({
  currentLocale,
  options,
  onChange,
  ariaLabelPrefix = 'Change language',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
      setIsMounted(true);
      setIsExiting(false);
    }
  };

  const closeMenu = () => {
    if (!isOpen) return;
    setIsOpen(false);
    setIsExiting(true);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExiting) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timeout = reducedMotion ? 0 : motionConstants.durationPopoverMs;
      
      timer = setTimeout(() => {
        setIsExiting(false);
        setIsMounted(false);
      }, timeout);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isExiting]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      setTimeout(() => {
        const activeItem = menuRef.current?.querySelector('[aria-selected="true"]') as HTMLElement;
        const firstItem = menuRef.current?.querySelector('[role="option"]') as HTMLElement;
        (activeItem || firstItem)?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const items = Array.from(menuRef.current?.querySelectorAll('[role="option"]') || []) as HTMLElement[];
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
    } else if (e.key === 'Tab') {
      closeMenu();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      closeMenu();
    }
  };

  const currentLabel = options.find((o) => o.code === currentLocale)?.label || currentLocale;
  const animationClass = isExiting ? tokens.motion.popoverExit : tokens.motion.popoverEnter;

  return (
    <div
      className={`relative inline-block text-left ${isOpen || isExiting ? 'z-50' : 'z-40'}`}
      ref={containerRef}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        id={triggerId}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${ariaLabelPrefix}, current language is ${currentLabel}`}
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{currentLabel}</span>
      </button>

      {isMounted && (
        <div
          ref={menuRef}
          className={`absolute right-0 z-50 mt-2 w-40 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none ${animationClass} ${tokens.motion.reduced}`}
          role="listbox"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
        >
          <div className="py-1">
            {options.map((option) => {
              const isSelected = option.code === currentLocale;
              return (
                <button
                  key={option.code}
                  onClick={() => { onChange(option.code); closeMenu(); }}
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
