// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HomepageContent } from './types';

export function validateHomepageContent(content: HomepageContent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content.version) {
    errors.push('Missing version');
  }

  if (!Array.isArray(content.components)) {
    errors.push('Components must be an array');
  }

  // TODO: Add more detailed validation logic using Zod or similar

  return {
    valid: errors.length === 0,
    errors
  };
}
