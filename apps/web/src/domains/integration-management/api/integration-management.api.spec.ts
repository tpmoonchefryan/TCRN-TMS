import { describe, expect, it, vi } from 'vitest';

import {
  createConsumer,
  createEmailTemplate,
  createTenantAdapter,
  createWebhook,
  type IntegrationConsumerRecord,
  listConsumers,
  listSocialPlatforms,
  type SocialPlatformRecord,
  updateConsumer,
  updateEmailTemplate,
  updateTenantAdapter,
  updateWebhook,
} from './integration-management.api';

function buildSocialPlatform(id: string): SocialPlatformRecord {
  return {
    id,
    code: id,
    name: id,
    nameEn: id,
    sortOrder: 0,
    isActive: true,
    version: 1,
  };
}

function buildConsumer(id: string): IntegrationConsumerRecord {
  return {
    id,
    code: id,
    name: id,
    nameEn: id,
    sortOrder: 0,
    isActive: true,
    version: 1,
    consumerCategory: 'internal',
  };
}

describe('integration-management.api pagination helpers', () => {
  it('loads additional social-platform pages when the first page is full', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => buildSocialPlatform(`platform-${index + 1}`));
    const secondPage = [buildSocialPlatform('platform-101')];
    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return firstPage;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=2&pageSize=100') {
        return secondPage;
      }

      throw new Error(`Unexpected request path: ${path}`);
    });

    const result = await listSocialPlatforms(request as never);

    expect(request).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(101);
    expect(result.at(-1)?.id).toBe('platform-101');
  });

  it('stops after the first consumer page when the batch is not full', async () => {
    const firstPage = [buildConsumer('consumer-1')];
    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100') {
        return firstPage;
      }

      throw new Error(`Unexpected request path: ${path}`);
    });

    const result = await listConsumers(request as never);

    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toEqual(firstPage);
  });

  it('sends managed translation payloads when creating consumers', async () => {
    const request = vi.fn(async () => buildConsumer('consumer-created'));

    await createConsumer(request as never, {
      code: 'CRM_SYNC',
      nameEn: 'CRM Sync',
      nameZh: '客户同步',
      translations: {
        en: 'CRM Sync',
        zh_HANS: '客户同步',
        fr: 'Synchronisation CRM',
      },
      consumerCategory: 'external',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/configuration-entity/consumer',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'CRM_SYNC',
          nameEn: 'CRM Sync',
          nameZh: '客户同步',
          translations: {
            en: 'CRM Sync',
            zh_HANS: '客户同步',
            fr: 'Synchronisation CRM',
          },
          consumerCategory: 'external',
        }),
      }),
    );
  });

  it('preserves managed translation payloads when updating consumers', async () => {
    const request = vi.fn(async () => buildConsumer('consumer-1'));

    await updateConsumer(request as never, 'consumer-1', {
      version: 3,
      nameEn: 'CRM Sync',
      nameZh: '客户同步',
      translations: {
        en: 'CRM Sync',
        zh_HANS: '客户同步',
        ko: 'CRM 동기화',
      },
      consumerCategory: 'external',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/configuration-entity/consumer/consumer-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          version: 3,
          nameEn: 'CRM Sync',
          nameZh: '客户同步',
          translations: {
            en: 'CRM Sync',
            zh_HANS: '客户同步',
            ko: 'CRM 동기화',
          },
          consumerCategory: 'external',
        }),
      }),
    );
  });

  it('sends managed translation payloads when creating adapters', async () => {
    const request = vi.fn(async () => ({
      id: 'adapter-1',
      ownerType: 'tenant',
      ownerId: null,
      platform: { id: 'platform-1', code: 'BILIBILI', displayName: 'Bilibili' },
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      adapterType: 'api_key',
      inherit: true,
      isActive: true,
      configs: [],
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
      version: 1,
    }));

    await createTenantAdapter(request as never, {
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      nameZh: '哔哩同步',
      translations: {
        en: 'Bili Sync',
        zh_HANS: '哔哩同步',
        ko: '빌리 동기화',
      },
      adapterType: 'api_key',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/integration/adapters',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          platformId: 'platform-1',
          code: 'BILI_SYNC',
          nameEn: 'Bili Sync',
          nameZh: '哔哩同步',
          translations: {
            en: 'Bili Sync',
            zh_HANS: '哔哩同步',
            ko: '빌리 동기화',
          },
          adapterType: 'api_key',
        }),
      }),
    );
  });

  it('sends managed translation payloads when updating adapters', async () => {
    const request = vi.fn(async () => ({
      id: 'adapter-1',
      ownerType: 'tenant',
      ownerId: null,
      platform: { id: 'platform-1', code: 'BILIBILI', displayName: 'Bilibili' },
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      adapterType: 'api_key',
      inherit: true,
      isActive: true,
      configs: [],
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
      version: 2,
    }));

    await updateTenantAdapter(request as never, 'adapter-1', {
      version: 2,
      nameEn: 'Bili Sync',
      nameZh: '哔哩同步',
      translations: {
        en: 'Bili Sync',
        zh_HANS: '哔哩同步',
        fr: 'Synchronisation Bilibili',
      },
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/integration/adapters/adapter-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          version: 2,
          nameEn: 'Bili Sync',
          nameZh: '哔哩同步',
          translations: {
            en: 'Bili Sync',
            zh_HANS: '哔哩同步',
            fr: 'Synchronisation Bilibili',
          },
        }),
      }),
    );
  });

  it('sends managed translation payloads when creating webhooks', async () => {
    const request = vi.fn(async () => ({
      id: 'webhook-1',
      code: 'CUSTOMER_DELTA',
      nameEn: 'Customer Delta',
      url: 'https://example.com',
      events: ['customer.created'],
      isActive: true,
      lastTriggeredAt: null,
      lastStatus: null,
      consecutiveFailures: 0,
      createdAt: '2026-04-20T00:00:00.000Z',
    }));

    await createWebhook(request as never, {
      code: 'CUSTOMER_DELTA',
      nameEn: 'Customer Delta',
      nameZh: '客户变更',
      translations: {
        en: 'Customer Delta',
        zh_HANS: '客户变更',
        fr: 'Delta client',
      },
      url: 'https://example.com/webhook',
      events: ['customer.created'],
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/integration/webhooks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'CUSTOMER_DELTA',
          nameEn: 'Customer Delta',
          nameZh: '客户变更',
          translations: {
            en: 'Customer Delta',
            zh_HANS: '客户变更',
            fr: 'Delta client',
          },
          url: 'https://example.com/webhook',
          events: ['customer.created'],
        }),
      }),
    );
  });

  it('sends managed translation payloads when updating webhooks', async () => {
    const request = vi.fn(async () => ({
      id: 'webhook-1',
      code: 'CUSTOMER_DELTA',
      nameEn: 'Customer Delta',
      url: 'https://example.com',
      events: ['customer.created'],
      isActive: true,
      lastTriggeredAt: null,
      lastStatus: null,
      consecutiveFailures: 0,
      createdAt: '2026-04-20T00:00:00.000Z',
    }));

    await updateWebhook(request as never, 'webhook-1', {
      version: 4,
      nameEn: 'Customer Delta',
      nameZh: '客户变更',
      translations: {
        en: 'Customer Delta',
        zh_HANS: '客户变更',
        ko: '고객 변경',
      },
      url: 'https://example.com/webhook',
      events: ['customer.created'],
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/integration/webhooks/webhook-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          version: 4,
          nameEn: 'Customer Delta',
          nameZh: '客户变更',
          translations: {
            en: 'Customer Delta',
            zh_HANS: '客户变更',
            ko: '고객 변경',
          },
          url: 'https://example.com/webhook',
          events: ['customer.created'],
        }),
      }),
    );
  });

  it('sends managed translation payloads when creating email templates', async () => {
    const request = vi.fn(async () => ({
      code: 'WELCOME_EMAIL',
      nameEn: 'Welcome Email',
      subjectEn: 'Welcome',
      bodyHtmlEn: '<p>Hello</p>',
      bodyTextEn: 'Hello',
      variables: [],
      category: 'system',
      isActive: true,
    }));

    await createEmailTemplate(request as never, {
      code: 'WELCOME_EMAIL',
      nameEn: 'Welcome Email',
      nameZh: '欢迎邮件',
      translations: {
        en: 'Welcome Email',
        zh_HANS: '欢迎邮件',
        zh_HANT: '歡迎郵件',
      },
      subjectEn: 'Welcome',
      subjectZh: '欢迎',
      subjectTranslations: {
        en: 'Welcome',
        zh_HANS: '欢迎',
        fr: 'Bienvenue',
      },
      bodyHtmlEn: '<p>Hello</p>',
      bodyHtmlZh: '<p>你好</p>',
      bodyHtmlTranslations: {
        en: '<p>Hello</p>',
        zh_HANS: '<p>你好</p>',
        ko: '<p>안녕하세요</p>',
      },
      bodyTextEn: 'Hello',
      bodyTextTranslations: {
        en: 'Hello',
        fr: 'Bonjour',
      },
      category: 'system',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/email-templates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'WELCOME_EMAIL',
          nameEn: 'Welcome Email',
          nameZh: '欢迎邮件',
          translations: {
            en: 'Welcome Email',
            zh_HANS: '欢迎邮件',
            zh_HANT: '歡迎郵件',
          },
          subjectEn: 'Welcome',
          subjectZh: '欢迎',
          subjectTranslations: {
            en: 'Welcome',
            zh_HANS: '欢迎',
            fr: 'Bienvenue',
          },
          bodyHtmlEn: '<p>Hello</p>',
          bodyHtmlZh: '<p>你好</p>',
          bodyHtmlTranslations: {
            en: '<p>Hello</p>',
            zh_HANS: '<p>你好</p>',
            ko: '<p>안녕하세요</p>',
          },
          bodyTextEn: 'Hello',
          bodyTextTranslations: {
            en: 'Hello',
            fr: 'Bonjour',
          },
          category: 'system',
        }),
      }),
    );
  });

  it('sends managed translation payloads when updating email templates', async () => {
    const request = vi.fn(async () => ({
      code: 'WELCOME_EMAIL',
      nameEn: 'Welcome Email',
      subjectEn: 'Welcome',
      bodyHtmlEn: '<p>Hello</p>',
      bodyTextEn: 'Hello',
      variables: [],
      category: 'system',
      isActive: true,
    }));

    await updateEmailTemplate(request as never, 'WELCOME_EMAIL', {
      nameEn: 'Welcome Email',
      translations: {
        en: 'Welcome Email',
        fr: 'E-mail de bienvenue',
      },
      subjectEn: 'Welcome',
      subjectTranslations: {
        en: 'Welcome',
        ko: '환영합니다',
      },
      bodyHtmlEn: '<p>Hello</p>',
      bodyHtmlTranslations: {
        en: '<p>Hello</p>',
        zh_HANT: '<p>您好</p>',
      },
      bodyTextEn: 'Hello',
      bodyTextTranslations: {
        en: 'Hello',
        fr: 'Bonjour',
      },
      category: 'system',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/email-templates/WELCOME_EMAIL',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          nameEn: 'Welcome Email',
          translations: {
            en: 'Welcome Email',
            fr: 'E-mail de bienvenue',
          },
          subjectEn: 'Welcome',
          subjectTranslations: {
            en: 'Welcome',
            ko: '환영합니다',
          },
          bodyHtmlEn: '<p>Hello</p>',
          bodyHtmlTranslations: {
            en: '<p>Hello</p>',
            zh_HANT: '<p>您好</p>',
          },
          bodyTextEn: 'Hello',
          bodyTextTranslations: {
            en: 'Hello',
            fr: 'Bonjour',
          },
          category: 'system',
        }),
      }),
    );
  });
});
