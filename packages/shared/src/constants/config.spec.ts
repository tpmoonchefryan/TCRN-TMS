import { describe, expect, it } from 'vitest';

import { AppConfig } from './config';
import { SUPPORTED_UI_LOCALES } from './locale';

describe('AppConfig locale contract', () => {
  it('keeps the legacy supported-languages export aligned with supported UI locales', () => {
    expect(AppConfig.SUPPORTED_LANGUAGES).toEqual(SUPPORTED_UI_LOCALES);
  });
});
