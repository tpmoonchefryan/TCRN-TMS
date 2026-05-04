import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { SendEmailDto } from './send-email.dto';

function createDto(locale?: string) {
  const dto = new SendEmailDto();
  dto.tenantSchema = 'tenant_ac';
  dto.templateCode = 'WELCOME_EMAIL';
  dto.recipientEmail = 'talent@example.com';
  dto.locale = locale;
  dto.variables = { name: 'Aki' };
  return dto;
}

describe('SendEmailDto locale validation', () => {
  it.each(SUPPORTED_UI_LOCALES)('accepts supported UI locale %s', async (locale) => {
    await expect(validate(createDto(locale))).resolves.toEqual([]);
  });

  it('rejects legacy aggregate zh locale', async () => {
    const errors = await validate(createDto('zh'));

    expect(errors).toEqual([
      expect.objectContaining({
        property: 'locale',
      }),
    ]);
  });
});
