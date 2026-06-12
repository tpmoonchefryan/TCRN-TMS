import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nextConfig = require('./next.config.js');

describe('next dev origin configuration', () => {
  it('defaults to loopback origins without enumerating the LAN subnet', () => {
    expect(nextConfig.allowedDevOrigins).toEqual(['127.0.0.1', 'localhost']);
    expect(nextConfig.allowedDevOrigins).not.toContain('192.168.51.1');
    expect(nextConfig.allowedDevOrigins).not.toContain('192.168.51.254');
  });

  it('allows LAN testing only through exact env-provided origins', () => {
    expect(
      nextConfig.readAllowedDevOrigins(
        'http://192.168.51.105:3000,https://devbox.example.test:8443/_next/webpack-hmr,localhost,192.168.51.249:3000'
      )
    ).toEqual([
      '127.0.0.1',
      'localhost',
      '192.168.51.105',
      'devbox.example.test',
      '192.168.51.249',
    ]);
  });

  it('exposes test helpers only in the test runtime', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(nextConfig.readAllowedDevOrigins).toBeTypeOf('function');
  });
});
