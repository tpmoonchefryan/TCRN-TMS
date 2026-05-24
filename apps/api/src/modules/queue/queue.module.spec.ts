// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import { QUEUE_NAMES } from './queue.module';

describe('QUEUE_NAMES', () => {
  it('keeps the API queue registry aligned with the current worker queue families', () => {
    const queueNames = Object.values(QUEUE_NAMES);

    expect(queueNames).toEqual([
      'import',
      'report',
      'membership-renewal',
      'log',
      'log-cleanup',
      'export',
      'marshmallow-export',
      'email',
    ]);
    expect(new Set(queueNames).size).toBe(queueNames.length);
  });
});
