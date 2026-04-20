import { describe, expect, it } from 'vitest';

import { ConfigService } from './config.service';
import {
  CONFIG_HAS_EXTRA_DATA,
  type BaseConfigEntity,
  type ConfigEntityType,
  type ConfigEntityWithMeta,
} from './config.types';

interface TranslationPayload {
  contentTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  extraData: Record<string, unknown> | null;
  legacyFields: Record<string, string | null | undefined>;
  translations: Record<string, string>;
}

interface DecoratedConfigEntity extends BaseConfigEntity {
  contentTranslations?: Record<string, string>;
  description: string | null;
  descriptionTranslations: Record<string, string>;
  name: string;
  translations: Record<string, string>;
}

interface TestableConfigService {
  decorateEntity(
    entityType: ConfigEntityType,
    entity: BaseConfigEntity & Record<string, unknown>,
    language: string,
  ): DecoratedConfigEntity;
  prepareTranslationPayload(
    entityType: ConfigEntityType,
    data: Record<string, unknown>,
    current?: ConfigEntityWithMeta | null,
  ): TranslationPayload;
}

const createBaseEntity = (overrides: Partial<BaseConfigEntity> = {}): BaseConfigEntity => ({
  id: 'config-1',
  ownerType: 'tenant',
  ownerId: null,
  code: 'CUSTOMER_STATUS',
  nameEn: 'Active',
  nameZh: '活跃',
  nameJa: 'アクティブ',
  descriptionEn: 'Can transact',
  descriptionZh: '可以交易',
  descriptionJa: '取引可能',
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

describe('ConfigService translation contract', () => {
  const service = new ConfigService() as unknown as TestableConfigService;

  it('stores non-legacy locale maps in extraData while keeping legacy fallback fields aligned', () => {
    const payload = service.prepareTranslationPayload('consent', {
      nameEn: 'Terms consent',
      translations: {
        en: 'Terms consent',
        zh_HANS: '条款同意',
        zh_HANT: '條款同意',
        ja: '規約同意',
        ko: '약관 동의',
        fr: 'Consentement aux conditions',
      },
      descriptionTranslations: {
        en: 'Consent required before access',
        fr: 'Consentement requis avant accès',
      },
      contentTranslations: {
        en: 'I agree to the terms.',
        zh_HANS: '我同意条款。',
        zh_HANT: '我同意條款。',
        ja: '規約に同意します。',
        fr: "J'accepte les conditions.",
      },
      extraData: {
        auditTag: 'owner-managed',
        translations: {
          stale: 'should be replaced',
        },
      },
    });

    expect(payload.legacyFields).toMatchObject({
      nameEn: 'Terms consent',
      nameZh: '条款同意',
      nameJa: '規約同意',
      descriptionEn: 'Consent required before access',
      contentMarkdownEn: 'I agree to the terms.',
      contentMarkdownZh: '我同意条款。',
      contentMarkdownJa: '規約に同意します。',
    });
    expect(payload.extraData).toEqual({
      auditTag: 'owner-managed',
      translations: {
        zh_HANT: '條款同意',
        ko: '약관 동의',
        fr: 'Consentement aux conditions',
      },
      descriptionTranslations: {
        fr: 'Consentement requis avant accès',
      },
      contentTranslations: {
        zh_HANT: '我同意條款。',
        fr: "J'accepte les conditions.",
      },
    });
  });

  it('resolves full Accept-Language locale tokens from translation maps before legacy fields', () => {
    const decorated = service.decorateEntity(
      'customer-status',
      createBaseEntity({
        extraData: {
          translations: {
            zh_HANT: '活躍客戶',
            fr: 'Client actif',
          },
          descriptionTranslations: {
            zh_HANT: '可以交易的客戶',
            ko: '거래 가능한 고객',
          },
        },
      }),
      'zh-Hant',
    );

    expect(decorated.name).toBe('活躍客戶');
    expect(decorated.description).toBe('可以交易的客戶');
    expect(decorated.translations).toMatchObject({
      en: 'Active',
      zh_HANS: '活跃',
      zh_HANT: '活躍客戶',
      ja: 'アクティブ',
      fr: 'Client actif',
    });
  });

  it('marks consumer as an extra_data-backed entity for managed locale maps', () => {
    expect(CONFIG_HAS_EXTRA_DATA.has('consumer')).toBe(true);
  });
});
