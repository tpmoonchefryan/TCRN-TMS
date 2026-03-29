import { describe, expect, it } from 'vitest';

import { isOptionValue } from './option-guards';

describe('option-guards', () => {
  it('accepts configured literal options and rejects unknown values', () => {
    const options = ['small', 'medium', 'large'] as const;

    expect(isOptionValue(options, 'medium')).toBe(true);
    expect(isOptionValue(options, 'xl')).toBe(false);
  });
});
