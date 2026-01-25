// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get environment name for display
 */
export function getEnvironmentName(): string {
  const env = process.env.NODE_ENV;
  if (env === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'staging') {
    return 'staging';
  }
  return 'production';
}

/**
 * Check if running in staging environment
 */
export function isStaging(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'staging'
  );
}
