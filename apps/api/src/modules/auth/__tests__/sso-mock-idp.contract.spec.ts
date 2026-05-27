import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { AuthService } from '../auth.service';
import { SsoService } from '../sso.service';
import {
  buildMockIdpClaims,
  buildMockIdpFixtureManifest,
  phase3MockOidcProvider,
} from '../testing/mock-oidc-provider';

const oidcMocks = {
  discovery: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
};

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

class TestableSsoService extends SsoService {
  protected async loadOidcClient() {
    return oidcMocks;
  }
}

describe('Phase 3 mock IdP protocol contract', () => {
  const tenant = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'UAT',
    name: 'UAT Tenant',
    schemaName: 'tenant_uat',
    tier: 'standard',
    isActive: true,
  };

  const provider = {
    id: '22222222-2222-4222-8222-222222222222',
    tenant_id: tenant.id,
    tenant_code: tenant.code,
    tenant_name: tenant.name,
    tenant_tier: tenant.tier,
    tenant_schema: tenant.schemaName,
    code: phase3MockOidcProvider.callbackProviderCode,
    display_name: { en: 'Mock SSO' },
    provider_type: 'mock',
    owner_scope: 'tenant_product',
    issuer_url: null,
    authorization_url: null,
    token_url: null,
    userinfo_url: null,
    jwks_url: null,
    client_id: null,
    client_secret_ref: null,
    redirect_uri: null,
    scopes: ['openid', 'profile', 'email'],
    claim_mapping_policy: {
      subject: 'sub',
      email: 'email',
      displayName: 'name',
      emailVerified: 'email_verified',
    },
    is_enabled: true,
  };

  const oidcProvider = {
    ...provider,
    provider_type: 'oidc',
    issuer_url: phase3MockOidcProvider.issuer,
    client_id: 'phase3-client',
    redirect_uri: 'http://localhost:4000/api/v1/auth/sso/callback/mock-sso',
  };

  const linkedUser = {
    link_id: '33333333-3333-4333-8333-333333333333',
    id: '44444444-4444-4444-8444-444444444444',
    username: 'alice',
    email: 'alice@example.com',
    display_name: 'Alice',
    avatar_url: null,
    preferred_language: 'en',
    is_totp_enabled: false,
    force_reset: false,
    password_changed_at: new Date('2026-05-27T00:00:00.000Z'),
    is_active: true,
  };

  const redisStore = new Map<string, string>();
  let service: SsoService;
  let authService: Pick<AuthService, 'completeLogin'>;

  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
    oidcMocks.discovery.mockReset();
    oidcMocks.buildAuthorizationUrl.mockReset();
    oidcMocks.authorizationCodeGrant.mockReset();
    oidcMocks.discovery.mockResolvedValue({ issuer: phase3MockOidcProvider.issuer });
    oidcMocks.buildAuthorizationUrl.mockImplementation(
      (_config: unknown, parameters: Record<string, string>) => {
        const url = new URL(`${phase3MockOidcProvider.issuer}/authorize`);
        for (const [key, value] of Object.entries(parameters)) {
          url.searchParams.set(key, value);
        }
        return url;
      }
    );
    authService = {
      completeLogin: vi.fn().mockResolvedValue({
        type: 'success',
        accessToken: 'tcrn-access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2026-05-27T01:00:00.000Z'),
        user: {
          id: linkedUser.id,
          username: linkedUser.username,
          email: linkedUser.email,
          displayName: linkedUser.display_name,
          avatarUrl: null,
          preferredLanguage: 'en',
          totpEnabled: false,
          forceReset: false,
          passwordExpiresAt: null,
          tenant: {
            id: tenant.id,
            code: tenant.code,
            name: tenant.name,
            tier: tenant.tier,
            schemaName: tenant.schemaName,
          },
        },
      }),
    };
    service = new TestableSsoService(
      authService as AuthService,
      {
        getTenantByCode: vi.fn().mockResolvedValue(tenant),
        getTenantById: vi.fn().mockResolvedValue(tenant),
      } as never,
      {
        set: vi.fn(async (key: string, value: string) => {
          redisStore.set(key, value);
        }),
        get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
        getdel: vi.fn(async (key: string) => {
          const value = redisStore.get(key) ?? null;
          redisStore.delete(key);
          return value;
        }),
        del: vi.fn(async (key: string) => {
          redisStore.delete(key);
        }),
      } as never,
      {
        revokeAllUserTokens: vi.fn().mockResolvedValue(1),
      } as never,
      {
        get: vi.fn((key: string, fallback: string) =>
          key === 'NODE_ENV' ? 'test' : fallback
        ),
      } as never
    );
  });

  async function startMockLogin(next?: string) {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([provider]);
    const start = await service.startLogin({
      tenantCode: tenant.code,
      providerCode: provider.code,
      next,
    });

    return new URL(start.authorizationUrl).searchParams.get('state') || '';
  }

  async function startOidcLogin(next?: string) {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([oidcProvider]);
    const start = await service.startLogin({
      tenantCode: tenant.code,
      providerCode: oidcProvider.code,
      next,
    });
    const authorizationUrl = new URL(start.authorizationUrl);

    return {
      state: authorizationUrl.searchParams.get('state') || '',
      nonce: authorizationUrl.searchParams.get('nonce') || '',
    };
  }

  it('publishes a redacted mock IdP fixture manifest', () => {
    const manifest = buildMockIdpFixtureManifest();

    expect(manifest.issuer).toBe('https://idp.test.tcrn.local/p3');
    expect(JSON.stringify(manifest)).not.toContain('private_key');
    expect(JSON.stringify(manifest)).not.toContain('client_secret');
    expect(manifest.supportedProtocolControls).toContain('bad_state');
    expect(manifest.supportedProtocolControls).toContain('unsafe_next_normalization');
    expect(manifest.supportedProtocolControls).toContain('wrong_issuer');
    expect(manifest.supportedProtocolControls).toContain('wrong_audience');
    expect(manifest.supportedProtocolControls).toContain('expired_token');
  });

  it('delegates OIDC state, nonce, and PKCE validation to openid-client before exchange issuance', async () => {
    const { state, nonce } = await startOidcLogin('/tenant/tenant-1/profile/security');
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([oidcProvider]);
    oidcMocks.authorizationCodeGrant.mockResolvedValueOnce({
      claims: () => ({
        sub: phase3MockOidcProvider.subjects.active,
        email: 'alice@example.com',
        name: 'Alice IdP',
        email_verified: true,
      }),
    });

    const redirectUrl = await service.handleCallback(oidcProvider.code, {
      state,
      code: 'oidc-code',
    });
    const callbackUrl = new URL(redirectUrl);

    expect(oidcMocks.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(URL),
      expect.objectContaining({
        expectedState: state,
        expectedNonce: nonce,
        pkceCodeVerifier: expect.any(String),
      })
    );
    expect(callbackUrl.pathname).toBe('/login/sso/callback');
    expect(callbackUrl.searchParams.get('result')).toMatch(/^ssox_/);
    expect(callbackUrl.search).not.toContain('access_token');
    expect(callbackUrl.search).not.toContain('id_token');
  });

  it.each([
    'bad_nonce',
    'wrong_issuer',
    'wrong_audience',
    'expired_token',
    'clock_skew_boundary',
  ])('denies OIDC protocol failures without issuing an exchange code: %s', async (control) => {
    const { state } = await startOidcLogin();
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([oidcProvider]);
    oidcMocks.authorizationCodeGrant.mockRejectedValueOnce(
      new UnauthorizedException(`OIDC protocol validation rejected ${control}`)
    );

    await expect(
      service.handleCallback(oidcProvider.code, {
        state,
        code: `oidc-code-${control}`,
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.completeLogin).not.toHaveBeenCalled();
    expect(Array.from(redisStore.keys()).some((key) => key.startsWith('sso:exchange:'))).toBe(
      false
    );
  });

  it('denies callback attempts with missing or invalid state before session issuance', async () => {
    await expect(
      service.handleCallback(provider.code, buildMockIdpClaims())
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.handleCallback(provider.code, {
        ...buildMockIdpClaims(),
        state: 'ssos_missing',
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.completeLogin).not.toHaveBeenCalled();
  });

  it('normalizes unsafe next targets and never redirects to an external origin', async () => {
    const state = await startMockLogin('https://evil.example.test/phish');
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([provider]);

    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      ...buildMockIdpClaims(),
    });
    const callbackUrl = new URL(redirectUrl);

    expect(callbackUrl.origin).toBe('http://localhost:3000');
    expect(callbackUrl.pathname).toBe('/login/sso/callback');
    expect(callbackUrl.searchParams.get('next')).toBe('/');
    expect(callbackUrl.search).not.toContain('access_token');
    expect(callbackUrl.search).not.toContain('id_token');
  });

  it('denies missing-subject callbacks without issuing an exchange code', async () => {
    const state = await startMockLogin();
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([provider]);

    await expect(service.handleCallback(provider.code, { state })).rejects.toBeInstanceOf(
      BadRequestException
    );

    expect(Array.from(redisStore.keys()).some((key) => key.startsWith('sso:exchange:'))).toBe(false);
  });

  it('denies unlinked subjects during exchange before TCRN tokens are issued', async () => {
    const state = await startMockLogin();
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([]);

    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      ...buildMockIdpClaims(phase3MockOidcProvider.subjects.unlinked),
    });
    const resultCode = new URL(redirectUrl).searchParams.get('result') || '';

    await expect(service.exchangeResult(resultCode, '127.0.0.1')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(authService.completeLogin).not.toHaveBeenCalled();
  });

  it('consumes exchange codes once and rejects replay', async () => {
    const state = await startMockLogin();
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([linkedUser]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      ...buildMockIdpClaims(phase3MockOidcProvider.subjects.replay),
    });
    const resultCode = new URL(redirectUrl).searchParams.get('result') || '';

    await service.exchangeResult(resultCode, '127.0.0.1');
    await expect(service.exchangeResult(resultCode, '127.0.0.1')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
