// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { cn } from '@/lib/utils';

import { SpacerProps } from './schema';

export const Spacer: React.FC<SpacerProps & { className?: string }> = ({
  height,
  customHeight,
  className,
}) => {
  const heightClasses: Record<string, string> = {
    small: 'h-4',
    medium: 'h-8',
    large: 'h-16',
    xl: 'h-24',
    xxl: 'h-32',
    custom: '',
  };

  // Use customHeight for custom size, otherwise use preset
  const heightStyle = height === 'custom' && customHeight ? { height: `${customHeight}px` } : undefined;

  return (
    <div 
      className={cn(heightClasses[height] || '', "w-full", className)} 
      style={heightStyle}
    />
  );
};
