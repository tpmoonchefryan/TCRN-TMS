import React from 'react';

export interface BreadcrumbItem {
  key?: string;
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  ariaLabel: string;
  onNavigate?: (href: string) => void;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  ariaLabel,
  onNavigate,
  className = '',
}) => {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium text-slate-500">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isCurrent = item.isCurrent || isLast;
          const key = item.key || `${item.label}-${index}`;
          const contentClass = isCurrent
            ? 'max-w-[12rem] truncate text-slate-700'
            : 'max-w-[12rem] truncate text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500';

          return (
            <li key={key} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <span className="text-slate-300" aria-hidden="true">
                  /
                </span>
              ) : null}

              {item.href && !isCurrent ? (
                <a
                  href={item.href}
                  className={contentClass}
                  onClick={(event) => {
                    if (
                      !onNavigate ||
                      event.button !== 0 ||
                      event.ctrlKey ||
                      event.metaKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }

                    event.preventDefault();
                    onNavigate(item.href as string);
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <span className={contentClass} aria-current={isCurrent ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
