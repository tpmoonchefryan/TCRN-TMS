'use client';

import React from 'react';

import { tokens } from '@/platform/ui/foundations/tokens';

export interface SettingsCategoryWorkbenchItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SettingsCategoryWorkbenchProps {
  ariaLabel: string;
  categories: SettingsCategoryWorkbenchItem[];
  activeCategoryId: string;
  onCategoryChange?: (categoryId: string) => void;
  children: React.ReactNode;
}

export function SettingsCategoryWorkbench({
  ariaLabel,
  categories,
  activeCategoryId,
  onCategoryChange,
  children,
}: Readonly<SettingsCategoryWorkbenchProps>) {
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const focusableCategoryId = categories.some((category) => category.id === activeCategoryId)
    ? activeCategoryId
    : categories[0]?.id;

  const moveToCategory = (categoryId: string) => {
    onCategoryChange?.(categoryId);
    buttonRefs.current[categoryId]?.focus();
  };

  const handleCategoryNavKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (categories.length === 0) {
      return;
    }

    const activeIndex = Math.max(
      categories.findIndex((category) => category.id === focusableCategoryId),
      0
    );
    const lastIndex = categories.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = activeIndex >= lastIndex ? 0 : activeIndex + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = activeIndex <= 0 ? lastIndex : activeIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    moveToCategory(categories[nextIndex].id);
  };

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <nav
        className="min-w-0 border-b border-slate-200 pb-3 lg:border-r lg:border-b-0 lg:pr-4 lg:pb-0"
        aria-label={ariaLabel}
      >
        <div
          className="flex min-w-0 flex-wrap gap-2 pb-1 lg:flex-col lg:flex-nowrap lg:pb-0"
          onKeyDown={handleCategoryNavKeyDown}
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;

            return (
              <button
                key={category.id}
                ref={(node) => {
                  buttonRefs.current[category.id] = node;
                }}
                type="button"
                onClick={() => onCategoryChange?.(category.id)}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={category.id === focusableCategoryId ? 0 : -1}
                className={`inline-flex min-h-11 max-w-full flex-none items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:w-full ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-sm'
                    : `text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${tokens.motion.transitionStandard} motion-reduce:transition-none`
                } `}
              >
                {category.icon ? (
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center"
                    aria-hidden="true"
                  >
                    {category.icon}
                  </span>
                ) : null}
                <span className="break-words">{category.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}
