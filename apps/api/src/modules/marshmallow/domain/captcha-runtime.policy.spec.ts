import { describe, expect, it } from 'vitest';

import { buildCaptchaRuntimeStatus } from './captcha-runtime.policy';

describe('buildCaptchaRuntimeStatus', () => {
  it('bypasses provider verification in development without Cloudflare keys', () => {
    expect(
      buildCaptchaRuntimeStatus({
        nodeEnv: 'development',
        siteKey: null,
        secretKey: null,
      }),
    ).toMatchObject({
      environment: 'development',
      runtimeBypass: true,
      providerReady: false,
      ready: true,
    });
  });

  it('bypasses provider verification in test without Cloudflare keys', () => {
    expect(
      buildCaptchaRuntimeStatus({
        nodeEnv: 'test',
        siteKey: '',
        secretKey: '',
      }),
    ).toMatchObject({
      environment: 'test',
      runtimeBypass: true,
      providerReady: false,
      ready: true,
    });
  });

  it('fails closed in staging when Turnstile config is incomplete', () => {
    expect(
      buildCaptchaRuntimeStatus({
        nodeEnv: 'staging',
        siteKey: 'site-key',
        secretKey: '',
      }),
    ).toMatchObject({
      environment: 'staging',
      runtimeBypass: false,
      providerReady: false,
      ready: false,
    });
  });

  it('fails closed in production when Turnstile config is incomplete', () => {
    expect(
      buildCaptchaRuntimeStatus({
        nodeEnv: 'production',
        siteKey: '',
        secretKey: 'secret-key',
      }),
    ).toMatchObject({
      environment: 'production',
      runtimeBypass: false,
      providerReady: false,
      ready: false,
    });
  });

  it('requires real provider verification in staging and production when configured', () => {
    expect(
      buildCaptchaRuntimeStatus({
        nodeEnv: 'staging',
        siteKey: 'site-key',
        secretKey: 'secret-key',
      }),
    ).toMatchObject({
      runtimeBypass: false,
      providerReady: true,
      ready: true,
    });
  });
});
