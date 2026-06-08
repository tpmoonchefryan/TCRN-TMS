import React, { useRef } from 'react';

import { tokens } from '../foundations/tokens';

export interface SectionTabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  panelId?: string;
}

export interface SectionTabsProps {
  items: SectionTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

function getEnabledItems(items: SectionTabItem[]) {
  return items.filter((item) => !item.disabled);
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  items,
  activeId,
  onChange,
  ariaLabel,
  className = '',
}) => {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusItem = (id: string) => {
    itemRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledItems = getEnabledItems(items);
    if (enabledItems.length === 0) {
      return;
    }

    const activeIndex = enabledItems.findIndex((item) => item.id === activeId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextItem = enabledItems[(currentIndex + 1) % enabledItems.length];
      if (nextItem) {
        onChange(nextItem.id);
        focusItem(nextItem.id);
      }
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const previousItem =
        enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
      if (previousItem) {
        onChange(previousItem.id);
        focusItem(previousItem.id);
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstItem = enabledItems[0];
      if (firstItem) {
        onChange(firstItem.id);
        focusItem(firstItem.id);
      }
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastItem = enabledItems[enabledItems.length - 1];
      if (lastItem) {
        onChange(lastItem.id);
        focusItem(lastItem.id);
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex min-w-0 flex-wrap gap-2 rounded-[1.5rem] border border-slate-200 bg-white/70 p-2 shadow-sm ${className}`}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            ref={(node) => {
              itemRefs.current[item.id] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={item.panelId}
            aria-label={typeof item.count === 'number' ? `${item.label} ${item.count}` : undefined}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`inline-flex max-w-full flex-none items-center gap-2 rounded-[1rem] px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-slate-950 text-white shadow-sm' : `text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${tokens.motion.transitionStandard} motion-reduce:transition-none`}`}
          >
            <span className="break-words">{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
