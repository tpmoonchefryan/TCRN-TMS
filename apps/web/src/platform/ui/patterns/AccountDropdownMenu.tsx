import React, { useEffect, useId, useRef, useState } from 'react';

import { motionConstants, tokens } from '../foundations/tokens';

export interface AccountDropdownMenuProps {
  user: { name: string; avatarUrl?: string | null; email: string };
  onNavigateProfile: () => void;
  onNavigateSecurity: () => void;
  onSignOut: () => void;
  isSignOutPending?: boolean;
  labels: {
    trigger: string;
    profile: string;
    security: string;
    signOut: string;
    signingOut: string;
  };
}

export const AccountDropdownMenu: React.FC<AccountDropdownMenuProps> = ({
  user,
  onNavigateProfile,
  onNavigateSecurity,
  onSignOut,
  isSignOutPending = false,
  labels,
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
      // Small delay to ensure DOM is ready after mount
      setTimeout(() => {
        const firstItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement;
        firstItem?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []) as HTMLElement[];
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

  const resolvedLabels = labels; //
//    trigger: 'Account menu',
//    profile: 'My Profile',
//    security: 'Security / Sessions',
//    signOut: 'Sign Out',
//    signingOut: 'Signing out...',
//  };

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
        className={`flex items-center gap-2 p-1 rounded-full hover:bg-slate-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={resolvedLabels.trigger}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-200">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
      </button>

      {isMounted && (
        <div
          ref={menuRef}
          className={`absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none ${animationClass} ${tokens.motion.reduced}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
        >
          <div className="px-4 py-3 border-b border-slate-200/50">
            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { onNavigateProfile(); closeMenu(); }}
              role="menuitem"
              className="w-full text-left block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
            >
              {resolvedLabels.profile}
            </button>
            <button
              onClick={() => { onNavigateSecurity(); closeMenu(); }}
              role="menuitem"
              className="w-full text-left block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
            >
              {resolvedLabels.security}
            </button>
          </div>
          <div className="border-t border-slate-200/50 py-1">
            <button
              onClick={() => {
                onSignOut();
                if (!isSignOutPending) closeMenu();
              }}
              role="menuitem"
              disabled={isSignOutPending}
              className={`w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none focus-visible:bg-red-50 ${isSignOutPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSignOutPending ? resolvedLabels.signingOut : resolvedLabels.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
