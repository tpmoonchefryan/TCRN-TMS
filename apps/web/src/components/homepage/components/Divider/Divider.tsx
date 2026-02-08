// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { cn } from '@/lib/utils';

import { DividerProps } from './schema';

export const Divider: React.FC<DividerProps & { className?: string }> = ({
  style,
  spacing,
  color,
  className,
}) => {
  const spacingClasses = {
    small: 'my-4',
    medium: 'my-8',
    large: 'my-12',
  };

  const styleClasses = {
    solid: 'border-t-2',
    dashed: 'border-t-2 border-dashed',
    dotted: 'border-t-2 border-dotted',
  };
  
  const colorClasses = {
    default: 'border-[var(--hp-text-secondary)]/20',
    primary: 'border-[var(--hp-primary)]',
    accent: 'border-[var(--hp-accent)]',
  };

  return (
    <div className={cn(spacingClasses[spacing], "w-full max-w-lg mx-auto px-4", className)}>
      <div className={cn("w-full", styleClasses[style], colorClasses[color])} />
    </div>
  );
};
