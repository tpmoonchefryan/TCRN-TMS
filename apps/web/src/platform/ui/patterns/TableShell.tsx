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
  sortable?: boolean;
}

export type TableSortDirection = 'ascending' | 'descending';

export interface TableSortState {
  columnId: string;
  direction: TableSortDirection;
}

export interface TableSortControls {
  state: TableSortState | null;
  onChange: (nextState: TableSortState) => void;
  getSortButtonLabel: (column: TableColumn, currentDirection: TableSortDirection | null) => string;
  getSortIndicator?: (direction: TableSortDirection | null) => React.ReactNode;
}

export interface TableRowSelectionControls {
  visibleRowIds: string[];
  selectedRowIds: string[];
  onRowToggle: (rowId: string, selected: boolean) => void;
  onAllVisibleToggle: (selected: boolean) => void;
  getRowCheckboxLabel: (rowId: string) => string;
  selectAllLabel: string;
  getSelectedCountLabel: (count: number) => string;
  batchToolbarAriaLabel: string;
  batchActions?: React.ReactNode;
}

export interface TableShellSelectionCellOptions {
  className?: string;
  checkboxClassName?: string;
  ariaLabel?: string;
}

export interface TableShellRenderHelpers {
  isRowSelected: (rowId: string) => boolean;
  renderSelectionCell: (rowId: string, options?: TableShellSelectionCellOptions) => React.ReactNode;
}

export type TableShellChildren =
  | React.ReactNode
  | ((helpers: TableShellRenderHelpers) => React.ReactNode);

export interface TableShellProps {
  columns: Array<string | TableColumn>;
  dataLength: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  caption?: string;
  ariaLabel: string;
  density?: 'compact' | 'comfortable';
  stickyHeader?: boolean;
  sort?: TableSortControls;
  rowSelection?: TableRowSelectionControls;
  className?: string;
  tableClassName?: string;
  children: TableShellChildren;
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

function getNextSortDirection(direction: TableSortDirection | null): TableSortDirection {
  return direction === 'ascending' ? 'descending' : 'ascending';
}

function isRenderChildren(
  children: TableShellChildren
): children is (helpers: TableShellRenderHelpers) => React.ReactNode {
  return typeof children === 'function';
}

function IndeterminateCheckbox({
  indeterminate,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    indeterminate?: boolean;
  }
>) {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return <input ref={checkboxRef} type="checkbox" {...props} />;
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
  sort,
  rowSelection,
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
  const selectedRowIds = new Set(rowSelection?.selectedRowIds ?? []);
  const visibleRowIds = rowSelection?.visibleRowIds ?? [];
  const selectedVisibleCount = visibleRowIds.filter((rowId) => selectedRowIds.has(rowId)).length;
  const allVisibleSelected =
    visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const selectedCount = selectedRowIds.size;
  const selectionCheckboxClass =
    'h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2';

  // Handle transparent fading for background loading of new data (not first load)
  const bodyOpacityClass =
    isLoading && dataLength > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100';
  const renderSelectionCell: TableShellRenderHelpers['renderSelectionCell'] = (
    rowId,
    options = {}
  ) => {
    if (!rowSelection) {
      return null;
    }

    const isSelected = selectedRowIds.has(rowId);

    return (
      <td className={`${cellPaddingClass} w-12 ${options.className ?? ''}`}>
        <input
          type="checkbox"
          aria-label={options.ariaLabel ?? rowSelection.getRowCheckboxLabel(rowId)}
          checked={isSelected}
          onChange={(event) => rowSelection.onRowToggle(rowId, event.currentTarget.checked)}
          className={`${selectionCheckboxClass} ${options.checkboxClassName ?? ''}`}
        />
      </td>
    );
  };
  const renderHelpers: TableShellRenderHelpers = {
    isRowSelected: (rowId) => selectedRowIds.has(rowId),
    renderSelectionCell,
  };
  const tableChildren = isRenderChildren(children) ? children(renderHelpers) : children;

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass} ${className}`}
    >
      {rowSelection && selectedCount > 0 ? (
        <div
          role="toolbar"
          aria-label={rowSelection.batchToolbarAriaLabel}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
        >
          <span className="font-medium text-slate-800">
            {rowSelection.getSelectedCountLabel(selectedCount)}
          </span>
          {rowSelection.batchActions ? (
            <div className="flex flex-wrap items-center gap-2">{rowSelection.batchActions}</div>
          ) : null}
        </div>
      ) : null}
      <div className="w-full overflow-x-auto">
        <table
          aria-label={ariaLabel}
          className={`w-full border-collapse text-left ${tableClassName}`}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={headerStickyClass}>
            <tr className="border-b border-slate-200/60 bg-slate-50/50">
              {rowSelection ? (
                <th scope="col" className={`${cellPaddingClass} w-12`}>
                  <IndeterminateCheckbox
                    aria-label={rowSelection.selectAllLabel}
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    disabled={visibleRowIds.length === 0}
                    onChange={() => rowSelection.onAllVisibleToggle(!allVisibleSelected)}
                    className={selectionCheckboxClass}
                  />
                </th>
              ) : null}
              {normalizedColumns.map((column) => {
                const currentSortDirection =
                  sort?.state?.columnId === column.id ? sort.state.direction : null;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortable ? (currentSortDirection ?? 'none') : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    className={`${cellPaddingClass} text-sm font-semibold text-slate-600 ${getAlignClass(column.align)} ${column.headerClassName ?? ''} ${column.className ?? ''}`}
                  >
                    {column.sortable && sort ? (
                      <button
                        type="button"
                        aria-label={sort.getSortButtonLabel(column, currentSortDirection)}
                        onClick={() =>
                          sort.onChange({
                            columnId: column.id,
                            direction: getNextSortDirection(currentSortDirection),
                          })
                        }
                        className="inline-flex max-w-full items-center gap-2 rounded-md text-inherit transition outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                      >
                        <span className="truncate">{column.header}</span>
                        {sort.getSortIndicator ? (
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-xs font-medium text-slate-500"
                          >
                            {sort.getSortIndicator(currentSortDirection)}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            className={`divide-y divide-slate-100 ${tokens.motion.transitionQuick} ${tokens.motion.reduced} ${bodyOpacityClass}`}
          >
            {isLoading && dataLength === 0
              ? // Loading skeleton rows (Pulse is conditionally disabled by motion-reduce in Tailwind output)
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="animate-pulse motion-reduce:animate-none"
                  >
                    {rowSelection ? (
                      <td className={cellPaddingClass}>
                        <div className="h-4 w-4 rounded bg-slate-200/60"></div>
                      </td>
                    ) : null}
                    {normalizedColumns.map((column) => (
                      <td key={column.id} className={cellPaddingClass}>
                        <div className="h-4 w-3/4 rounded bg-slate-200/60"></div>
                      </td>
                    ))}
                  </tr>
                ))
              : // Actual data rows
                tableChildren}
          </tbody>
        </table>
      </div>
    </div>
  );
};
