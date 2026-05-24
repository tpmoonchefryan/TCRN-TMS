import React, { useId, useState } from 'react';

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { CommandSearchInput, type CommandSearchInputProps } from './CommandSearchInput';

export interface TopCommandBarProps {
  leftArea?: React.ReactNode;
  rightArea?: React.ReactNode;
  searchProps?: CommandSearchInputProps;
  breadcrumbItems?: BreadcrumbItem[];
  breadcrumbAriaLabel?: string;
  onBreadcrumbNavigate?: (href: string) => void;
  onMobileMenuOpen?: () => void;
  mobileMenuButtonLabel?: string;
  mobileSearchButtonLabel?: string;
  mobileSearchCloseLabel?: string;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  leftArea,
  rightArea,
  searchProps,
  breadcrumbItems,
  breadcrumbAriaLabel,
  onBreadcrumbNavigate,
  onMobileMenuOpen,
  mobileMenuButtonLabel,
  mobileSearchButtonLabel,
  mobileSearchCloseLabel,
}) => {
  const mobileSearchId = useId();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const hasSearch = Boolean(searchProps);
  const hasBreadcrumb = Boolean(
    breadcrumbItems && breadcrumbItems.length > 0 && breadcrumbAriaLabel
  );
  const hasMobileMenu = Boolean(onMobileMenuOpen && mobileMenuButtonLabel);
  const hasMobileSearch = Boolean(hasSearch && mobileSearchButtonLabel && mobileSearchCloseLabel);

  return (
    <div className="relative flex w-full flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {hasMobileMenu ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
            aria-label={mobileMenuButtonLabel}
            onClick={onMobileMenuOpen}
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        ) : null}

        <div className="min-w-0 space-y-1">
          {hasBreadcrumb ? (
            <div className="hidden min-w-0 sm:block">
              <Breadcrumb
                items={breadcrumbItems ?? []}
                ariaLabel={breadcrumbAriaLabel as string}
                onNavigate={onBreadcrumbNavigate}
              />
            </div>
          ) : null}
          {leftArea}
        </div>
      </div>

      <div className="hidden max-w-xl flex-1 md:block">
        {searchProps ? <CommandSearchInput {...searchProps} /> : null}
      </div>

      <div className="flex flex-none items-center gap-2 sm:gap-3">
        {hasMobileSearch ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
            aria-label={isMobileSearchOpen ? mobileSearchCloseLabel : mobileSearchButtonLabel}
            aria-expanded={isMobileSearchOpen}
            aria-controls={mobileSearchId}
            onClick={() => setIsMobileSearchOpen((current) => !current)}
          >
            <svg
              className="h-5 w-5"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileSearchOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              )}
            </svg>
          </button>
        ) : null}
        {rightArea}
      </div>

      {searchProps && hasMobileSearch && isMobileSearchOpen ? (
        <div
          id={mobileSearchId}
          className="absolute top-full right-0 left-0 mt-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur md:hidden"
        >
          <CommandSearchInput {...searchProps} autoFocus />
        </div>
      ) : null}
    </div>
  );
};
