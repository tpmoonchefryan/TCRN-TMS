import { describe, expect, it } from 'vitest';

import { buildPublicHomepageEndpoint } from '@/domains/public-homepage/api/public-homepage.api';

describe('buildPublicHomepageEndpoint', () => {
  it('maps shared-domain public homepage paths to the canonical public API endpoint', () => {
    expect(buildPublicHomepageEndpoint('tenant-a/suisei')).toBe(
      '/api/v1/public/homepage/tenant-a/suisei',
    );
    expect(buildPublicHomepageEndpoint('tenant-a/suisei/homepage')).toBe(
      '/api/v1/public/homepage/tenant-a/suisei',
    );
  });

  it('preserves legacy homepage paths as single-segment public API requests', () => {
    expect(buildPublicHomepageEndpoint('aki-home')).toBe('/api/v1/public/homepage/aki-home');
  });
});
