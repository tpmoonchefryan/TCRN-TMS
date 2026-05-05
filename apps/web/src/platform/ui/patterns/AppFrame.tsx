import React from 'react';

import { tokens } from '../foundations/tokens';

export interface AppFrameProps {
  sidebar: React.ReactNode;
  commandBar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  skipToMainLabel?: string;
}

export const AppFrame: React.FC<AppFrameProps> = ({
  sidebar,
  commandBar,
  banner,
  children,
  skipToMainLabel = 'Skip to main content',
}) => {
  return (
    <div className={`flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden ${tokens.colors.bgBase}`}>
      <a
        href="#app-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
          className={`z-20 flex min-h-0 w-64 flex-none flex-col overflow-hidden border-r ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
        >
          {sidebar}
        </aside>

        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
          <header
            className={`relative z-30 flex min-h-16 flex-none items-center overflow-visible border-b px-6 py-3 ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
          >
            {commandBar}
          </header>

          <main
            id="app-main-content"
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain p-6"
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
