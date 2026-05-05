// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ReportCatalogApplicationService } from '../application/report-catalog.service';

describe('ReportCatalogApplicationService', () => {
  const service = new ReportCatalogApplicationService();

  it('returns the canonical report catalog list', () => {
    expect(service.list()).toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: 'mfr',
          availability: expect.objectContaining({ status: 'available' }),
        }),
      ]),
    });
  });

  it('returns catalog metadata by report id', () => {
    expect(service.get('mfr')).toMatchObject({
      id: 'mfr',
      name: expect.objectContaining({ en: 'Member Feedback Report' }),
    });
  });

  it('rejects unknown report catalog ids', () => {
    expect(() => service.get('unknown')).toThrow(NotFoundException);
  });
});
