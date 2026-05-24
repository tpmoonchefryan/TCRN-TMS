import React, { useId } from 'react';

import { tokens } from '../foundations/tokens';
import { usePopoverListBehavior } from './popover-behavior';

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
  } = usePopoverListBehavior({ itemSelector: '[role="menuitem"]' });
  const triggerId = useId();

  const resolvedLabels = labels;

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
        className={`flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-slate-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
        onClick={togglePopover}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={resolvedLabels.trigger}
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-indigo-200 bg-indigo-100 font-bold text-indigo-700">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
      </button>

      {isMounted && (
        <div
          ref={popoverRef}
          className={`absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none ${animationClass} ${tokens.motion.reduced}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
        >
          <div className="border-b border-slate-200/50 px-4 py-3">
            <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onNavigateProfile();
                closePopover();
              }}
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
            >
              {resolvedLabels.profile}
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigateSecurity();
                closePopover();
              }}
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
            >
              {resolvedLabels.security}
            </button>
          </div>
          <div className="border-t border-slate-200/50 py-1">
            <button
              type="button"
              onClick={() => {
                onSignOut();
                if (!isSignOutPending) closePopover();
              }}
              role="menuitem"
              disabled={isSignOutPending}
              className={`block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none focus-visible:bg-red-50 ${isSignOutPending ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {isSignOutPending ? resolvedLabels.signingOut : resolvedLabels.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
