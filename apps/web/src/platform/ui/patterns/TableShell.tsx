import React from 'react';

import { tokens } from '../foundations/tokens';
import { StateView } from './StateView';

export interface TableColumn {
  id: string;
  header: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
}

export interface TableShellProps {
  columns: Array<string | TableColumn>;
  dataLength: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  caption?: string;
  ariaLabel: string;
  density?: 'compact' | 'comfortable';
  stickyHeader?: boolean;
  className?: string;
  tableClassName?: string;
}

function normalizeColumn(column: string | TableColumn, index: number): TableColumn {
  if (typeof column === 'string') {
    return {
      id: `${index}-${column}`,
      header: column,
    };
  }

  return column;
}

function getAlignClass(align: TableColumn['align']) {
  if (align === 'right') {
    return 'text-right';
  }

  if (align === 'center') {
    return 'text-center';
  }

  return 'text-left';
}

export const TableShell: React.FC<TableShellProps> = ({
  columns,
  dataLength,
  isLoading = false,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  caption,
  ariaLabel,
  density = 'comfortable',
  stickyHeader = false,
  className = '',
  tableClassName = '',
}) => {
  if (isEmpty && !isLoading) {
    return (
      <StateView
        status="empty"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const normalizedColumns = columns.map(normalizeColumn);
  const cellPaddingClass = density === 'compact' ? 'px-4 py-3' : 'px-6 py-4';
  const headerStickyClass = stickyHeader ? 'sticky top-0 z-10' : '';

  // Handle transparent fading for background loading of new data (not first load)
  const bodyOpacityClass = isLoading && dataLength > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100';

  return (
    <div className={`w-full overflow-x-auto rounded-xl border ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass} ${className}`}>
      <table aria-label={ariaLabel} className={`w-full border-collapse text-left ${tableClassName}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className={headerStickyClass}>
          <tr className="border-b border-slate-200/60 bg-slate-50/50">
            {normalizedColumns.map((column) => (
              <th
                key={column.id}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={`${cellPaddingClass} text-sm font-semibold text-slate-600 ${getAlignClass(column.align)} ${column.headerClassName ?? ''} ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y divide-slate-100 ${tokens.motion.transitionQuick} ${tokens.motion.reduced} ${bodyOpacityClass}`}>
          {isLoading && dataLength === 0 ? (
            // Loading skeleton rows (Pulse is conditionally disabled by motion-reduce in Tailwind output)
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="animate-pulse motion-reduce:animate-none">
                {normalizedColumns.map((column) => (
                  <td key={column.id} className={cellPaddingClass}>
                    <div className="h-4 w-3/4 rounded bg-slate-200/60"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : (
            // Actual data rows
            children
          )}
        </tbody>
      </table>
    </div>
  );
};
