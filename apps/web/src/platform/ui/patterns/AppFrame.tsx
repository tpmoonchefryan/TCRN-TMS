import React, { useEffect, useRef } from 'react';

import { tokens } from '../foundations/tokens';
import { useBodyScrollLock, useModalFocus } from './overlay-behavior';

export interface AppFrameProps {
  sidebar: React.ReactNode;
  commandBar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  skipToMainLabel?: string;
  isMobileSidebarOpen?: boolean;
  onMobileSidebarOpenChange?: (open: boolean) => void;
  mobileSidebarLabel: string;
  mobileSidebarCloseLabel: string;
}

export const AppFrame: React.FC<AppFrameProps> = ({
  sidebar,
  commandBar,
  banner,
  children,
  skipToMainLabel = 'Skip to main content',
  isMobileSidebarOpen = false,
  onMobileSidebarOpenChange,
  mobileSidebarLabel,
  mobileSidebarCloseLabel,
}) => {
  const canRenderMobileSidebar = Boolean(onMobileSidebarOpenChange);
  const isMobileSidebarMounted = canRenderMobileSidebar && isMobileSidebarOpen;
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileSidebarCloseButtonRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(isMobileSidebarMounted);
  useModalFocus({
    active: isMobileSidebarMounted,
    containerRef: mobileSidebarRef,
    initialFocusRef: mobileSidebarCloseButtonRef,
  });

  useEffect(() => {
    if (!isMobileSidebarMounted) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onMobileSidebarOpenChange?.(false);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarMounted, onMobileSidebarOpenChange]);

  return (
    <div
      className={`flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden ${tokens.colors.bgBase}`}
    >
      <a
        href="#app-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
      >
        {skipToMainLabel}
      </a>

      {banner && (
        <div className="z-50 w-full flex-none" role="banner">
          {banner}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`z-20 hidden min-h-0 w-64 flex-none flex-col overflow-hidden border-r md:flex ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
        >
          {sidebar}
        </aside>

        {isMobileSidebarMounted ? (
          <div className="fixed inset-0 z-[80] md:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 border-0 bg-slate-950/45 p-0 backdrop-blur-sm"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => onMobileSidebarOpenChange?.(false)}
            />
            <aside
              ref={mobileSidebarRef}
              role="dialog"
              tabIndex={-1}
              aria-modal="true"
              className={`absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-3rem))] max-w-full flex-col overflow-hidden border-r ${tokens.colors.border} ${tokens.colors.surface} shadow-2xl ${tokens.effects.glass}`}
              aria-label={mobileSidebarLabel}
            >
              <div className="flex flex-none items-center justify-end border-b border-slate-200/50 bg-white/70 px-4 py-3">
                <button
                  ref={mobileSidebarCloseButtonRef}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={mobileSidebarCloseLabel}
                  onClick={() => onMobileSidebarOpenChange?.(false)}
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
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">{sidebar}</div>
            </aside>
          </div>
        ) : null}

        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
          <header
            className={`relative z-30 flex min-h-16 flex-none items-center overflow-visible border-b px-4 py-3 sm:px-6 ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
          >
            {commandBar}
          </header>

          <main
            id="app-main-content"
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
