// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { AVAILABLE_REPORTS } from '../../../index';
import { AVAILABLE_REPORTS as legacyAvailableReports } from '../../../types/report/schema';
import type { MfrFilterCriteria } from './report';

describe('reporting-dataflow shared contracts', () => {
  it('keeps the canonical report catalog stable at the shared root entry', () => {
    expect(AVAILABLE_REPORTS).toEqual([
      {
        code: 'mfr',
        name: 'Member Feedback Report',
        description:
          'Export membership data including PII for physical gift delivery or digital rewards.',
        icon: 'Gift',
      },
    ]);
  });

  it('keeps the legacy flat report path as a thin compatibility entry', () => {
    expect(legacyAvailableReports).toEqual(AVAILABLE_REPORTS);
  });

  it('uses camelCase filter fields in the canonical shared contract', () => {
    const filters: MfrFilterCriteria = {
      platformCodes: ['bilibili'],
      membershipClassCodes: ['vip'],
      membershipTypeCodes: ['monthly'],
      membershipLevelCodes: ['gold'],
      statusCodes: ['active'],
      validFromStart: '2026-01-01',
      validFromEnd: '2026-01-31',
      validToStart: '2026-02-01',
      validToEnd: '2026-02-28',
      includeExpired: true,
      includeInactive: false,
    };

    expect(filters.platformCodes).toEqual(['bilibili']);
    expect(filters.includeInactive).toBe(false);

    // @ts-expect-error legacy snake_case is not part of the canonical shared contract
    const invalidFilters: MfrFilterCriteria = { platform_codes: ['bilibili'] };
    expect(invalidFilters).toEqual({ platform_codes: ['bilibili'] });
  });
});
