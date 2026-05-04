import { SUPPORTED_UI_LOCALES, TRILINGUAL_LOCALE_FAMILIES } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import { PUBLIC_MARSHMALLOW_CONFIG_SCHEMA } from './marshmallow-swagger.schemas';

type OpenApiObjectSchema = {
  properties?: Record<string, unknown>;
  required?: string[];
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
});
