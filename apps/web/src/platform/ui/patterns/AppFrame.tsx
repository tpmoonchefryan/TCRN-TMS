import React from 'react';

import { tokens } from '../foundations/tokens';

export interface AppFrameProps {
  sidebar: React.ReactNode;
  commandBar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export const AppFrame: React.FC<AppFrameProps> = ({ sidebar, commandBar, banner, children }) => {
  return (
    <div className={`min-h-[100dvh] flex flex-col ${tokens.colors.bgBase}`}>
      {banner && (
        <div className="z-50 w-full flex-none" role="banner">
          {banner}
        </div>
      )}

      <div className="flex flex-1 h-full overflow-hidden">
        <aside
          className={`z-20 flex w-64 flex-none flex-col border-r ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
        >
          {sidebar}
        </aside>

        <div className="relative z-0 flex min-w-0 flex-1 flex-col bg-transparent">
          <header
            className={`relative z-30 flex min-h-16 flex-none items-center overflow-visible border-b px-6 py-3 ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}
          >
            {commandBar}
          </header>

          <main className="relative z-0 flex-1 overflow-y-auto p-6" role="main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
