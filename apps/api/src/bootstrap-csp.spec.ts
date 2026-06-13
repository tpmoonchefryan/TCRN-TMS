// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://tcrn:tcrn@localhost:5432/tcrn_tms';
  process.env.JWT_SECRET ??= '12345678901234567890123456789012';
});

import { STRICT_API_CSP_DIRECTIVES, SWAGGER_CSP_DIRECTIVES } from './bootstrap';

describe('API CSP policy', () => {
  it('keeps the default API CSP strict', () => {
    expect(STRICT_API_CSP_DIRECTIVES.defaultSrc).toEqual(["'none'"]);
    expect(JSON.stringify(STRICT_API_CSP_DIRECTIVES)).not.toContain("'unsafe-inline'");
    expect(JSON.stringify(STRICT_API_CSP_DIRECTIVES)).not.toContain("'unsafe-eval'");
  });

  it('scopes relaxed script/style directives to Swagger UI only', () => {
    expect(SWAGGER_CSP_DIRECTIVES.defaultSrc).toEqual(["'self'"]);
    expect(SWAGGER_CSP_DIRECTIVES.scriptSrc).toContain("'unsafe-inline'");
    expect(SWAGGER_CSP_DIRECTIVES.scriptSrc).toContain("'unsafe-eval'");
    expect(SWAGGER_CSP_DIRECTIVES.styleSrc).toContain("'unsafe-inline'");
  });
});
