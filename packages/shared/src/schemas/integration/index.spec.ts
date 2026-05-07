// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { INTEGRATION_ADAPTER_DEFINITIONS } from '../../types/integration/schema';
import {
  AdapterConfigMutationItemSchema,
  AdapterTypeSchema,
  CreateAdapterSchema,
  CreateWebhookSchema,
  UpdateAdapterConfigsSchema,
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
      definitionKey: 'openai-ai',
      configs: [
        { configKey: 'endpoint_path', configValue: '/v1/responses' },
        { configKey: 'model', configValue: 'gpt-example' },
        { configKey: 'token', configValue: 'secret-token' },
      ],
    })).toEqual({
      definitionKey: 'openai-ai',
      inherit: true,
      configs: [
        { configKey: 'endpoint_path', configValue: '/v1/responses' },
        { configKey: 'model', configValue: 'gpt-example' },
        { configKey: 'token', configValue: 'secret-token' },
      ],
    });
  });

  it('rejects free adapter identity fields when creating from a supported definition', () => {
    expect(() =>
      CreateAdapterSchema.parse({
        definitionKey: 'openai-ai',
        platformId: '11111111-1111-4111-8111-111111111111',
        adapterType: 'api_key',
        code: 'FREE_FORM',
        nameEn: 'Free form',
        configs: [
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

  it('accepts ai as a first-class adapter type and exposes the three approved AI provider definitions', () => {
    expect(AdapterTypeSchema.parse('ai')).toBe('ai');

    const aiDefinitions = INTEGRATION_ADAPTER_DEFINITIONS.filter(
      (definition) => definition.adapterType === 'ai',
    );

    expect(aiDefinitions.map((definition) => definition.aiProvider).sort()).toEqual([
      'ANTHROPIC',
      'GEMINI',
      'OPENAI',
    ]);
    expect(
      aiDefinitions.map((definition) => ({
        key: definition.key,
        configKeys: definition.configFields.map((field) => field.key),
        invocationRuntime: definition.protocol.invocationRuntime,
      })),
    ).toEqual([
      {
        key: 'openai-ai',
        configKeys: ['endpoint_path', 'model', 'token'],
        invocationRuntime: 'not_implemented',
      },
      {
        key: 'anthropic-ai',
        configKeys: ['endpoint_path', 'model', 'token'],
        invocationRuntime: 'not_implemented',
      },
      {
        key: 'gemini-ai',
        configKeys: ['endpoint_path', 'model', 'token'],
        invocationRuntime: 'not_implemented',
      },
    ]);
  });

  it('accepts webhook creation by developer-provided definition key', () => {
    expect(CreateWebhookSchema.parse({
      definitionKey: 'customer-lifecycle',
      url: 'https://example.com/webhook',
    })).toMatchObject({
      definitionKey: 'customer-lifecycle',
      url: 'https://example.com/webhook',
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
    })).toMatchObject({
      code: 'CUSTOMER_LIFECYCLE',
      events: ['customer.created'],
    });
  });
});
