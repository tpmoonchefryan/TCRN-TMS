import { SUPPORTED_UI_LOCALES, TRILINGUAL_LOCALE_FAMILIES } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import { PUBLIC_MARSHMALLOW_CONFIG_SCHEMA, PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA } from './marshmallow-swagger.schemas';

type OpenApiObjectSchema = {
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
};

const asObjectSchema = (value: unknown): OpenApiObjectSchema => value as OpenApiObjectSchema;

describe('marshmallow swagger locale contracts', () => {
  it('documents public legal copy as trilingual families instead of supported UI locale tags', () => {
    const schema = asObjectSchema(PUBLIC_MARSHMALLOW_CONFIG_SCHEMA);
    const properties = schema.properties ?? {};
    const expectedFamilies = [...TRILINGUAL_LOCALE_FAMILIES];

    for (const field of ['terms', 'privacy']) {
      const localizedSchema = asObjectSchema(properties[field]);

      expect(Object.keys(localizedSchema.properties ?? {})).toEqual(expectedFamilies);
      expect(localizedSchema.required).toEqual(expectedFamilies);
      expect(localizedSchema.required).not.toEqual([...SUPPORTED_UI_LOCALES]);
    }
  });

  it('documents public captcha mode and non-secret Turnstile readiness', () => {
    const schema = asObjectSchema(PUBLIC_MARSHMALLOW_CONFIG_SCHEMA);
    const properties = schema.properties ?? {};
    const turnstileSchema = asObjectSchema(properties.turnstile);

    expect(properties.captchaMode).toBeDefined();
    expect(properties.turnstile).toBeDefined();
    expect(turnstileSchema.required).toEqual([
      'environment',
      'siteKeyConfigured',
      'secretKeyConfigured',
      'providerReady',
      'runtimeBypass',
      'ready',
    ]);
    expect(schema.required).toEqual(
      expect.arrayContaining(['captchaMode', 'turnstile']),
    );
  });

  it('does not document internal responder identifiers or email on the public message contract', () => {
    const schema = asObjectSchema(PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA);
    const properties = schema.properties ?? {};
    const messagesSchema = asObjectSchema(properties.messages);
    const messageItemSchema = asObjectSchema(messagesSchema.items);
    const repliedBySchema = asObjectSchema((messageItemSchema.properties ?? {}).repliedBy);

    expect(Object.keys(repliedBySchema.properties ?? {})).toEqual(['displayName', 'avatarUrl']);
    expect(repliedBySchema.required).toEqual(['displayName', 'avatarUrl']);
  });
});
