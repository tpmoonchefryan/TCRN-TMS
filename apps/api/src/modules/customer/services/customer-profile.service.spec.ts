// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { CustomerProfileService } from './customer-profile.service';

describe('CustomerProfileService formatDetailItem', () => {
  it('keeps company contact fields in the detail response', () => {
    const service = new CustomerProfileService({} as never, {} as never, {} as never);

    const formatted = (service as unknown as {
      formatDetailItem: (item: Record<string, unknown>) => Record<string, unknown>;
    }).formatDetailItem({
      id: 'customer-1',
      talentId: 'talent-1',
      profileStoreId: 'store-1',
      originTalentId: 'origin-1',
      lastModifiedTalentId: null,
      rmProfileId: 'rm-1',
      profileType: 'company',
      nickname: 'Acme',
      primaryLanguage: 'en',
      notes: null,
      tags: [],
      source: null,
      isActive: true,
      inactivatedAt: null,
      createdAt: new Date('2026-03-29T00:00:00.000Z'),
      updatedAt: new Date('2026-03-29T00:00:00.000Z'),
      createdBy: null,
      updatedBy: null,
      version: 3,
      talent: { id: 'talent-1', code: 'AC', displayName: 'Aqua' },
      profileStore: { id: 'store-1', code: 'DEFAULT', nameEn: 'Default' },
      originTalent: { id: 'origin-1', code: 'AC', displayName: 'Aqua' },
      lastModifiedTalent: null,
      status: null,
      inactivationReason: null,
      companyInfo: {
        companyLegalName: 'Acme Corp',
        companyShortName: 'Acme',
        registrationNumber: 'REG-1',
        vatId: 'VAT-1',
        establishmentDate: new Date('2020-01-01T00:00:00.000Z'),
        website: 'https://acme.example.com',
        contactName: 'Alice',
        contactPhone: '+1-555-0100',
        contactEmail: 'alice@acme.example.com',
        contactDepartment: 'Partnerships',
        businessSegment: {
          id: 'segment-1',
          code: 'ENT',
          nameEn: 'Entertainment',
        },
      },
      membershipRecords: [],
      _count: { platformIdentities: 0, membershipRecords: 0 },
      accessLogs: [],
    });

    expect(formatted.company).toMatchObject({
      companyLegalName: 'Acme Corp',
      contactName: 'Alice',
      contactPhone: '+1-555-0100',
      contactEmail: 'alice@acme.example.com',
      contactDepartment: 'Partnerships',
    });
  });
});
