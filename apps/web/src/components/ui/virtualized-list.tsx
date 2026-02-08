// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// VirtualizedList - Generic virtualized list component for performance optimization

'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, ReactNode, useRef } from 'react';

import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

function VirtualizedListInner<T>({
  items,
  estimateSize,
  renderItem,
  className,
  overscan = 5,
  getItemKey,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getItemKey 
            ? getItemKey(item, virtualRow.index) 
            : virtualRow.key;

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export memoized version
export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

// Hook for custom virtualization
export { useVirtualizer } from '@tanstack/react-virtual';
