// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { AdapterConfigMutationItemSchema, UpdateAdapterConfigsSchema } from './index';

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
