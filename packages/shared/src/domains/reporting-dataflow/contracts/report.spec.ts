// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import { AVAILABLE_REPORTS, REPORT_CATALOG } from '../../../index';
import { AVAILABLE_REPORTS as legacyAvailableReports } from '../../../types/report/schema';
import type { MfrFilterCriteria } from './report';

describe('reporting-dataflow shared contracts', () => {
  it('keeps MFR as the first real API-backed catalog item', () => {
    expect(REPORT_CATALOG).toHaveLength(1);
    expect(REPORT_CATALOG[0]).toMatchObject({
      id: 'mfr',
      name: {
        en: 'Member Feedback Report',
      },
      availability: {
        status: 'available',
        requiredPermissions: [
          {
            resource: 'report.mfr',
            actions: ['read', 'export'],
          },
        ],
      },
      artifactKinds: ['xlsx', 'csv', 'pii_platform_portal'],
      filterSchema: {
        version: 1,
      },
    });

    expect(REPORT_CATALOG[0].filterSchema.fields.map((field) => field.type)).toEqual([
      'config-multi-select',
      'config-multi-select',
      'config-multi-select',
      'config-multi-select',
      'config-multi-select',
      'date-range',
      'date-range',
      'boolean',
      'boolean',
      'raw-code-list',
    ]);
    expect(REPORT_CATALOG[0].filterSchema.fields.at(-1)).toMatchObject({
      id: 'platformCodesRaw',
      type: 'raw-code-list',
      advanced: true,
      fallbackForFieldId: 'platformCodes',
    });
  });

  it('keeps the legacy report definition entry as a thin compatibility view', () => {
    expect(AVAILABLE_REPORTS).toEqual([
      {
        code: 'mfr',
        name: REPORT_CATALOG[0].name.en,
        description: REPORT_CATALOG[0].description.en,
        icon: REPORT_CATALOG[0].icon,
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
