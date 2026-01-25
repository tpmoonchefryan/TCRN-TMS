// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { SpacerProps } from './schema';

import { cn } from '@/lib/utils';

export const Spacer: React.FC<SpacerProps & { className?: string }> = ({
  height,
  className,
}) => {
  const heightClasses = {
    small: 'h-4',
    medium: 'h-8',
    large: 'h-16',
    xl: 'h-24',
    xxl: 'h-32',
  };

  return (
    <div className={cn(heightClasses[height], "w-full", className)} />
  );
};
