import React from 'react';

export interface TopCommandBarProps {
  leftArea?: React.ReactNode;
  rightArea?: React.ReactNode;
  searchProps?: {
    placeholder?: string;
    onSearch?: (query: string) => void;
    shortcutKey?: string;
    ariaLabel?: string;
  };
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({ leftArea, rightArea, searchProps }) => {
  return (
    <div className="flex-1 flex justify-between items-center gap-4 w-full">
      <div className="flex-none flex items-center gap-4">
        {leftArea}
      </div>

      <div className="flex-1 max-w-xl hidden md:block">
        {searchProps && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={searchProps.placeholder}
              className={`block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-colors`}
              onChange={(e) => searchProps.onSearch?.(e.target.value)}
              aria-label={searchProps.ariaLabel}
            />
            {searchProps.shortcutKey && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <kbd className="inline-flex items-center border border-slate-200 rounded px-2 text-sm font-sans font-medium text-slate-400">
                  {searchProps.shortcutKey}
                </kbd>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-none flex items-center gap-4">
        {rightArea}
      </div>
    </div>
  );
};
