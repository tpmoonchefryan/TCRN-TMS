// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  INTEGRATION_ADAPTER_CREATE_DEFINITIONS,
  INTEGRATION_ADAPTER_DEFINITIONS,
} from '../../types/integration/schema';
import {
  AdapterConfigMutationItemSchema,
  AdapterTypeSchema,
  CreateAdapterSchema,
  CreateWebhookSchema,
  UpdateAdapterConfigsSchema,
  UpdateWebhookSchema,
} from './index';

describe('integration adapter config mutation schema', () => {
  it('accepts explicit keep, replace, and clear secret mutation intents', () => {
    expect(AdapterConfigMutationItemSchema.parse({
      configKey: 'api_key',
      mutation: 'keep',
    })).toEqual({
      configKey: 'api_key',
      mutation: 'keep',
    });
    expect(AdapterConfigMutationItemSchema.parse({
      configKey: 'access_token',
      mutation: 'clear',
    })).toEqual({
      configKey: 'access_token',
      mutation: 'clear',
    });
    expect(AdapterConfigMutationItemSchema.parse({
      configKey: 'base_url',
      mutation: 'replace',
      configValue: 'https://example.com',
    })).toEqual({
      configKey: 'base_url',
      mutation: 'replace',
      configValue: 'https://example.com',
    });
  });

  it('treats legacy config payloads without mutation as replace payloads', () => {
    expect(AdapterConfigMutationItemSchema.parse({
      configKey: 'base_url',
      configValue: 'https://example.com',
    })).toEqual({
      configKey: 'base_url',
      configValue: 'https://example.com',
    });
  });

  it('rejects empty replacements and values attached to non-replace intents', () => {
    expect(() =>
      AdapterConfigMutationItemSchema.parse({
        configKey: 'base_url',
        mutation: 'replace',
        configValue: '',
      }),
    ).toThrow();
    expect(() =>
      AdapterConfigMutationItemSchema.parse({
        configKey: 'api_key',
        mutation: 'keep',
        configValue: 'leaked-secret',
      }),
    ).toThrow();
    expect(() =>
      AdapterConfigMutationItemSchema.parse({
        configKey: 'access_token',
        mutation: 'clear',
        configValue: '',
      }),
    ).toThrow();
  });

  it('validates batched update payloads with mixed mutation intents', () => {
    expect(UpdateAdapterConfigsSchema.parse({
      adapterVersion: 7,
      configs: [
        {
          configKey: 'api_key',
          mutation: 'keep',
        },
        {
          configKey: 'base_url',
          mutation: 'replace',
          configValue: 'https://example.com',
        },
        {
          configKey: 'access_token',
          mutation: 'clear',
        },
      ],
    }).configs).toHaveLength(3);
  });
});

describe('integration definition-backed create schema', () => {
  it('accepts adapter creation by developer-provided definition key without free platform/type fields', () => {
    expect(CreateAdapterSchema.parse({
      definitionKey: 'ai-adapter',
      configs: [
        { configKey: 'provider', configValue: 'OPENAI' },
        { configKey: 'endpoint_path', configValue: '/v1/responses' },
        { configKey: 'model', configValue: 'gpt-example' },
        { configKey: 'token', configValue: 'secret-token' },
      ],
    })).toEqual({
      definitionKey: 'ai-adapter',
      inherit: true,
      configs: [
        { configKey: 'provider', configValue: 'OPENAI' },
        { configKey: 'endpoint_path', configValue: '/v1/responses' },
        { configKey: 'model', configValue: 'gpt-example' },
        { configKey: 'token', configValue: 'secret-token' },
      ],
    });
  });

  it('rejects free adapter identity fields when creating from a supported definition', () => {
    expect(() =>
      CreateAdapterSchema.parse({
        definitionKey: 'ai-adapter',
        platformId: '11111111-1111-4111-8111-111111111111',
        adapterType: 'api_key',
        code: 'FREE_FORM',
        nameEn: 'Free form',
        configs: [
          { configKey: 'provider', configValue: 'OPENAI' },
          { configKey: 'endpoint_path', configValue: '/v1/responses' },
          { configKey: 'model', configValue: 'gpt-example' },
          { configKey: 'token', configValue: 'secret-token' },
        ],
      }),
    ).toThrow();
  });

  it('keeps legacy adapter creation explicit when no definition key is provided', () => {
    expect(() =>
      CreateAdapterSchema.parse({
        code: 'LEGACY_SYNC',
        nameEn: 'Legacy Sync',
      }),
    ).toThrow();

    expect(CreateAdapterSchema.parse({
      platformId: '11111111-1111-4111-8111-111111111111',
      adapterType: 'api_key',
      code: 'LEGACY_SYNC',
      nameEn: 'Legacy Sync',
    })).toMatchObject({
      platformId: '11111111-1111-4111-8111-111111111111',
      adapterType: 'api_key',
      code: 'LEGACY_SYNC',
      nameEn: 'Legacy Sync',
    });
  });

  it('accepts ai as a first-class adapter type and exposes one addable AI Adapter create definition', () => {
    expect(AdapterTypeSchema.parse('ai')).toBe('ai');

    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS).toHaveLength(1);
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS[0]).toMatchObject({
      key: 'ai-adapter',
      code: 'AI_ADAPTER',
      adapterType: 'ai',
      protocol: {
        invocationRuntime: 'not_implemented',
      },
    });
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS[0].configFields.map((field) => field.key)).toEqual([
      'provider',
      'endpoint_path',
      'model',
      'token',
    ]);
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS[0].configFields[0]).toMatchObject({
      key: 'provider',
      input: 'select',
      secret: false,
      options: [
        { value: 'OPENAI' },
        { value: 'ANTHROPIC' },
        { value: 'GEMINI' },
      ],
    });
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS[0].aiProviders?.map((provider) => provider.provider)).toEqual([
      'OPENAI',
      'ANTHROPIC',
      'GEMINI',
    ]);
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS.map((definition) => definition.key)).not.toContain('bilibili-api-key');
    expect(INTEGRATION_ADAPTER_CREATE_DEFINITIONS.map((definition) => definition.key)).not.toContain('youtube-oauth');
  });

  it('keeps legacy adapter definitions available outside the addable create catalog', () => {
    expect(INTEGRATION_ADAPTER_DEFINITIONS.map((definition) => definition.key)).toEqual(
      expect.arrayContaining([
        'ai-adapter',
        'bilibili-api-key',
        'youtube-oauth',
        'openai-ai',
        'anthropic-ai',
        'gemini-ai',
      ]),
    );
  });

  it('accepts webhook creation by developer-provided definition key', () => {
    expect(CreateWebhookSchema.parse({
      definitionKey: 'customer-lifecycle',
      url: 'https://example.com/webhook',
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    })).toMatchObject({
      definitionKey: 'customer-lifecycle',
      url: 'https://example.com/webhook',
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    });

    expect(() =>
      CreateWebhookSchema.parse({
        definitionKey: 'customer-lifecycle',
        code: 'CUSTOMER_LIFECYCLE',
        nameEn: 'Customer lifecycle',
        url: 'https://example.com/webhook',
        events: ['customer.created'],
      }),
    ).toThrow();
  });

  it('keeps legacy webhook creation explicit when no definition key is provided', () => {
    expect(() =>
      CreateWebhookSchema.parse({
        url: 'https://example.com/webhook',
      }),
    ).toThrow();

    expect(CreateWebhookSchema.parse({
      code: 'CUSTOMER_LIFECYCLE',
      nameEn: 'Customer lifecycle',
      url: 'https://example.com/webhook',
      events: ['customer.created'],
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    })).toMatchObject({
      code: 'CUSTOMER_LIFECYCLE',
      events: ['customer.created'],
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    });
  });

  it('rejects invalid monitored talent ids and accepts webhook updates with monitored talent filters', () => {
    expect(() =>
      CreateWebhookSchema.parse({
        code: 'CUSTOMER_LIFECYCLE',
        nameEn: 'Customer lifecycle',
        url: 'https://example.com/webhook',
        events: ['customer.created'],
        monitoredTalentIds: ['not-a-uuid'],
      }),
    ).toThrow();

    expect(UpdateWebhookSchema.parse({
      version: 4,
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    })).toMatchObject({
      version: 4,
      monitoredTalentIds: ['11111111-1111-4111-8111-111111111111'],
    });
  });
});
