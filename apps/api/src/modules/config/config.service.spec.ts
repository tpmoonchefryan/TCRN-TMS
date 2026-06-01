import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';
import { createLocalizedText, type PartialLocalizedText } from '@tcrn/shared';

import { ConfigService } from './config.service';
import {
  type BaseConfigEntity,
  type ConfigEntityWithMeta,
  type ConfigEntityType,
} from './config.types';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

interface DecoratedConfigEntity extends BaseConfigEntity {
  localizedDescription: string | null;
  localizedName: string;
}

interface TestableConfigService {
  decorateEntity(
    entityType: ConfigEntityType,
    entity: Omit<BaseConfigEntity, 'name' | 'description'> & {
      description: unknown;
      name: unknown;
    },
    language: string
  ): DecoratedConfigEntity;
}

const localized = (en: string, patch: PartialLocalizedText = {}) =>
  createLocalizedText({ en, ...patch });

const createBaseEntity = (overrides: Partial<BaseConfigEntity> = {}): BaseConfigEntity => ({
  id: 'config-1',
  ownerType: 'tenant',
  ownerId: null,
  code: 'CUSTOMER_STATUS',
  name: localized('Active', {
    fr: 'Actif',
    ja: 'アクティブ',
    zh_HANS: '活跃',
    zh_HANT: '活躍',
  }),
  description: localized('Can transact', {
    ko: '거래 가능',
    zh_HANT: '可以交易',
  }),
  extraData: null,
  sortOrder: 0,
  isActive: true,
  isForceUse: false,
  isSystem: false,
  createdAt: new Date('2026-04-20T00:00:00.000Z'),
  updatedAt: new Date('2026-04-20T00:00:00.000Z'),
  createdBy: null,
  updatedBy: null,
  version: 1,
  ...overrides,
});

describe('ConfigService LocalizedText contract', () => {
  const service = new ConfigService();
  const testableService = service as unknown as TestableConfigService;

  beforeEach(() => {
    mockPrisma.$executeRawUnsafe.mockReset();
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('searches the single LocalizedText name JSONB field', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]);

    await service.list('membership-type', 'tenant_test', {
      includeDisabled: true,
      search: 'Membre',
    });

    const countSql = String(mockPrisma.$queryRawUnsafe.mock.calls[0][0]);

    expect(countSql).toContain('jsonb_each_text(name)');
    expect(countSql).toContain('localized_text.value ILIKE');
    expect(mockPrisma.$queryRawUnsafe.mock.calls[0][1]).toBe('%Membre%');
  });

  it('creates consent content as single LocalizedText JSONB columns', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([
      createBaseEntity({
        contentMarkdown: localized('I agree to the terms.'),
      } as Partial<BaseConfigEntity>),
    ]);

    await service.create(
      'consent',
      'tenant_test',
      {
        code: 'TERMS',
        consentVersion: '1.0',
        contentMarkdown: localized('I agree to the terms.', {
          fr: "J'accepte les conditions.",
        }),
        effectiveFrom: new Date('2026-05-18'),
        isRequired: true,
        name: localized('Terms consent', {
          fr: 'Consentement aux conditions',
        }),
      },
      '00000000-0000-0000-0000-000000000001'
    );

    const insertSql = String(mockPrisma.$queryRawUnsafe.mock.calls[1][0]);
    const insertParams = mockPrisma.$queryRawUnsafe.mock.calls[1].slice(1);

    expect(insertSql).toContain('name');
    expect(insertSql).toContain('content_markdown');
    expect(
      insertParams.some((value) => String(value).includes('"fr":"Consentement aux conditions"'))
    ).toBe(true);
    expect(
      insertParams.some((value) => String(value).includes('"fr":"J\'accepte les conditions."'))
    ).toBe(true);
  });

  it('returns LocalizedText plus request-locale display derivatives', () => {
    const decorated = testableService.decorateEntity(
      'customer-status',
      createBaseEntity(),
      'zh-Hant'
    );

    expect(decorated.name.zh_HANT).toBe('活躍');
    expect(decorated.description?.ko).toBe('거래 가능');
    expect(decorated.localizedName).toBe('活躍');
    expect(decorated.localizedDescription).toBe('可以交易');
  });

  it('rejects non-tenant artist-stage creation attempts', async () => {
    await expect(
      service.create(
        'artist-stage',
        'tenant_test',
        {
          code: 'PRE_DEBUT',
          name: localized('Pre-Debut'),
          ownerType: 'subsidiary',
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('tenant-owned');

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('requires homepage template type when creating artist stages', async () => {
    await expect(
      service.create(
        'artist-stage',
        'tenant_test',
        {
          artistStatusCode: 'draft',
          code: 'PRE_DEBUT',
          name: localized('Pre-Debut'),
          ownerType: 'tenant',
          ownerId: null,
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('Homepage Template Type');

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('requires artist status when creating artist stages', async () => {
    await expect(
      service.create(
        'artist-stage',
        'tenant_test',
        {
          code: 'PRE_DEBUT',
          homepageTemplateTypeCode: 'pending-reveal',
          name: localized('Pre-Debut'),
          ownerType: 'tenant',
          ownerId: null,
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('Artist Status');

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects inactive artist status dictionary references for artist stages', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    await expect(
      service.create(
        'artist-stage',
        'tenant_test',
        {
          artistStatusCode: 'archived',
          code: 'ARCHIVED',
          homepageTemplateTypeCode: 'operating',
          name: localized('Archived'),
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('Artist Status');

    const dictionarySql = String(mockPrisma.$queryRawUnsafe.mock.calls[0][0]);
    expect(dictionarySql).toContain('public.system_dictionary');
    expect(mockPrisma.$queryRawUnsafe.mock.calls[0].slice(1)).toEqual([
      'artist-status',
      'archived',
    ]);
  });

  it('rejects inactive homepage template type dictionary references for artist stages', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ code: 'published' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.create(
        'artist-stage',
        'tenant_test',
        {
          artistStatusCode: 'published',
          code: 'PREVIEW',
          homepageTemplateTypeCode: 'preview-only',
          name: localized('Preview'),
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('Homepage Template Type');

    expect(mockPrisma.$queryRawUnsafe.mock.calls[1].slice(1)).toEqual([
      'homepage-template-type',
      'preview-only',
    ]);
  });

  it('persists artist stage homepage template type as the config entity source of truth', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ code: 'published' }])
      .mockResolvedValueOnce([{ code: 'operating' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        createBaseEntity({
          artistStatusCode: 'published',
          code: 'ACTIVE',
          homepageTemplateTypeCode: 'operating',
        } as Partial<BaseConfigEntity>),
      ]);

    await service.create(
      'artist-stage',
      'tenant_test',
      {
        artistStatusCode: 'published',
        code: 'ACTIVE',
        homepageTemplateTypeCode: 'operating',
        name: localized('Active'),
      },
      '00000000-0000-0000-0000-000000000001'
    );

    const insertSql = String(mockPrisma.$queryRawUnsafe.mock.calls[3][0]);
    const insertParams = mockPrisma.$queryRawUnsafe.mock.calls[3].slice(1);

    expect(insertSql).toContain('artist_status_code');
    expect(insertSql).toContain('homepage_template_type_code');
    expect(insertParams).toContain('published');
    expect(insertParams).toContain('operating');
  });

  it('rejects lower-scope disable overrides for artist-stage entities', async () => {
    vi.spyOn(service, 'findById').mockResolvedValue(
      createBaseEntity({
        id: 'artist-stage-1',
        ownerType: 'tenant',
        ownerId: null,
        code: 'PRE_DEBUT',
      }) as ConfigEntityWithMeta
    );

    await expect(
      service.disableInScope(
        'artist-stage',
        'artist-stage-1',
        'tenant_test',
        'subsidiary',
        '550e8400-e29b-41d4-a716-446655440000',
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow('tenant-owned');

    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
