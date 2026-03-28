// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { configValidationSchema } from '../config.schema';
import { getProductionUrlWarning } from '../config-sanity.service';

const baseEnv = {
  DATABASE_URL: 'postgresql://tcrn:tcrn@localhost:5432/tcrn_tms',
  JWT_SECRET: '12345678901234567890123456789012',
};

describe('configValidationSchema', () => {
  it('treats blank APP_URL and FRONTEND_URL as missing and falls back to localhost defaults', () => {
    const { error, value } = configValidationSchema.validate({
      ...baseEnv,
      FRONTEND_URL: '',
      APP_URL: '',
    });

    expect(error).toBeUndefined();
    expect(value.FRONTEND_URL).toBe('http://localhost:3000');
    expect(value.APP_URL).toBe('http://localhost:3000');
  });

  it('rejects invalid FRONTEND_URL values', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      FRONTEND_URL: 'not-a-url',
    });

    expect(error?.details.some((detail) => detail.path[0] === 'FRONTEND_URL')).toBe(true);
  });
});

describe('getProductionUrlWarning', () => {
  it('warns when production app links still point to loopback', () => {
    const warning = getProductionUrlWarning(
      'production',
      'FRONTEND_URL',
      'http://localhost:3000',
      'Password reset and email verification links may send users to localhost.',
    );

    expect(warning).toContain('FRONTEND_URL');
    expect(warning).toContain('localhost');
  });

  it('does not warn for non-production or public URLs', () => {
    expect(
      getProductionUrlWarning(
        'development',
        'FRONTEND_URL',
        'http://localhost:3000',
        'Password reset and email verification links may send users to localhost.',
      ),
    ).toBeNull();

    expect(
      getProductionUrlWarning(
        'production',
        'APP_URL',
        'https://web.prod.tcrn-tms.com',
        'Homepage and public-page links may point operators or users back to localhost.',
      ),
    ).toBeNull();
  });
});
