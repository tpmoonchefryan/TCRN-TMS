import React from 'react';

import { tokens } from '../foundations/tokens';
import { StateView } from './StateView';

export interface TableShellProps {
  columns: string[];
  dataLength: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

export const TableShell: React.FC<TableShellProps> = ({
  columns,
  dataLength,
  isLoading = false,
  isEmpty = false,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display at this time.',
  emptyAction,
  children,
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

  // Handle transparent fading for background loading of new data (not first load)
  const bodyOpacityClass = isLoading && dataLength > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100';

  return (
    <div className={`w-full overflow-x-auto rounded-xl border ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200/60 bg-slate-50/50">
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 text-sm font-semibold text-slate-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y divide-slate-100 ${tokens.motion.transitionQuick} ${tokens.motion.reduced} ${bodyOpacityClass}`}>
          {isLoading && dataLength === 0 ? (
            // Loading skeleton rows (Pulse is conditionally disabled by motion-reduce in Tailwind output)
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`skeleton-${idx}`} className="animate-pulse motion-reduce:animate-none">
                {columns.map((_, colIdx) => (
                  <td key={colIdx} className="px-6 py-4">
                    <div className="h-4 bg-slate-200/60 rounded w-3/4"></div>
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
