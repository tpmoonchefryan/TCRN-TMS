import { describe, expect, it } from 'vitest';

import { AppConfig } from './config';

describe('AppConfig locale contract', () => {
  it('does not expose a legacy supported-languages locale source', () => {
    expect('SUPPORTED_LANGUAGES' in AppConfig).toBe(false);
    expect('DEFAULT_LANGUAGE' in AppConfig).toBe(false);
  });
});
