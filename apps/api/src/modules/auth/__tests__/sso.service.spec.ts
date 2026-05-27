import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { AuthService } from '../auth.service';
import { SsoService } from '../sso.service';

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

describe('SsoService', () => {
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
    code: 'mock-sso',
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
  let tokenService: {
    revokeAllUserTokens: ReturnType<typeof vi.fn>;
  };
  let tenantService: {
    getTenantByCode: ReturnType<typeof vi.fn>;
    getTenantById: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
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

    tenantService = {
      getTenantByCode: vi.fn().mockResolvedValue(tenant),
      getTenantById: vi.fn().mockResolvedValue(tenant),
    };
    tokenService = {
      revokeAllUserTokens: vi.fn().mockResolvedValue(1),
    };
    configService = {
      get: vi.fn((key: string, fallback: string) => (key === 'NODE_ENV' ? 'test' : fallback)),
    };

    service = new SsoService(
      authService as AuthService,
      tenantService as never,
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
      tokenService as never,
      configService as never
    );
  });

  it('completes mock SSO through an opaque one-time exchange code without URL tokens', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([linkedUser]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

    const start = await service.startLogin({
      tenantCode: tenant.code,
      providerCode: provider.code,
      next: '/tenant/tenant-1/organization-structure',
    });
    const authorizationUrl = new URL(start.authorizationUrl);
    const state = authorizationUrl.searchParams.get('state');

    expect(state).toMatch(/^ssos_/);
    expect(start.provider).toEqual({
      id: provider.id,
      code: provider.code,
      displayName: provider.display_name,
      providerType: 'mock',
      ownerScope: 'tenant_product',
      enabled: true,
    });

    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      subject: 'idp-subject-1',
      email: 'alice@example.com',
      displayName: 'Alice IdP',
    });
    const callbackUrl = new URL(redirectUrl);
    const resultCode = callbackUrl.searchParams.get('result');

    expect(callbackUrl.pathname).toBe('/login/sso/callback');
    expect(callbackUrl.search).not.toContain('access_token');
    expect(callbackUrl.search).not.toContain('id_token');
    expect(callbackUrl.search).not.toContain('alice@example.com');
    expect(resultCode).toMatch(/^ssox_/);

    const result = await service.exchangeResult(resultCode || '', '127.0.0.1', 'Vitest');

    expect(result.type).toBe('success');
    expect(authService.completeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        id: linkedUser.id,
        tenant_id: tenant.id,
        tenant_code: tenant.code,
      }),
      tenant.schemaName,
      '127.0.0.1',
      'Vitest',
      { authMethod: 'sso', enforcePreSessionPosture: true, requirePermissionSnapshot: true }
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('AND link.provider_issuer = $2'),
      provider.id,
      'mock:mock-sso',
      'idp-subject-1'
    );
  });

  it('hides and rejects mock SSO providers outside isolated test runtimes', async () => {
    configService.get.mockImplementation((key: string, fallback: string) =>
      key === 'NODE_ENV' ? 'production' : key === 'TCRN_ALLOW_MOCK_SSO' ? 'true' : fallback
    );
    mockPrisma.$queryRawUnsafe.mockResolvedValue([provider]);

    await expect(service.listProviders(tenant.code)).resolves.toEqual([]);
    await expect(
      service.startLogin({ tenantCode: tenant.code, providerCode: provider.code })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.upsertManagedProvider(tenant.id, linkedUser.id, {
        code: 'mock-sso',
        displayName: { en: 'Mock SSO' },
        providerType: 'mock',
        ownerScope: 'tenant_product',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps mock SSO denied in staging even when the override flag is set', async () => {
    configService.get.mockImplementation((key: string, fallback: string) =>
      key === 'NODE_ENV' ? 'staging' : key === 'TCRN_ALLOW_MOCK_SSO' ? 'true' : fallback
    );
    mockPrisma.$queryRawUnsafe.mockResolvedValue([provider]);

    await expect(service.listProviders(tenant.code)).resolves.toEqual([]);
    await expect(
      service.startLogin({ tenantCode: tenant.code, providerCode: provider.code })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects stale exchange results when the provider issuer changed', async () => {
    const issuerAProvider = {
      ...provider,
      provider_type: 'oidc' as const,
      issuer_url: 'https://issuer-a.example.test',
      client_id: 'client-a',
    };
    const issuerBProvider = {
      ...issuerAProvider,
      issuer_url: 'https://issuer-b.example.test',
    };
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([issuerAProvider])
      .mockResolvedValueOnce([issuerAProvider])
      .mockResolvedValueOnce([issuerBProvider]);

    const privateService = service as unknown as {
      buildOidcAuthorizationUrl: () => Promise<string>;
      exchangeOidcCallback: () => Promise<{
        subject: string;
        email: string | null;
        displayName: string | null;
        emailVerified: boolean | null;
        raw: Record<string, unknown>;
      }>;
    };

    vi.spyOn(privateService, 'buildOidcAuthorizationUrl').mockResolvedValueOnce(
      'https://issuer-a.example.test/authorize?state=ssos_placeholder'
    );
    vi.spyOn(privateService, 'exchangeOidcCallback').mockResolvedValueOnce({
      subject: 'idp-subject-1',
      email: 'alice@example.com',
      displayName: 'Alice IdP',
      emailVerified: true,
      raw: { sub: 'idp-subject-1' },
    });

    const start = await service.startLogin({
      tenantCode: tenant.code,
      providerCode: issuerAProvider.code,
    });
    const state = Array.from(redisStore.values()).map((value) => JSON.parse(value))[0].state;
    await service.handleCallback(issuerAProvider.code, { state, code: 'oidc-code' });
    const resultCode =
      Array.from(redisStore.keys())
        .find((key) => key.startsWith('sso:exchange:'))
        ?.replace('sso:exchange:', '') || '';

    expect(start.provider.providerType).toBe('oidc');
    await expect(service.exchangeResult(resultCode, '127.0.0.1')).rejects.toThrow(
      UnauthorizedException
    );
    expect(authService.completeLogin).not.toHaveBeenCalled();
  });

  it('rejects a reused SSO exchange code', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([linkedUser]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

    const start = await service.startLogin({
      tenantCode: tenant.code,
      providerCode: provider.code,
    });
    const state = new URL(start.authorizationUrl).searchParams.get('state');
    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      subject: 'idp-subject-1',
    });
    const resultCode = new URL(redirectUrl).searchParams.get('result') || '';

    await service.exchangeResult(resultCode, '127.0.0.1');
    await expect(service.exchangeResult(resultCode, '127.0.0.1')).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('links the current user through an opaque account-link result code', async () => {
    tenantService.getTenantById.mockResolvedValueOnce(tenant);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '55555555-5555-4555-8555-555555555555',
          provider_id: provider.id,
          provider_code: provider.code,
          provider_issuer: 'mock:mock-sso',
          email: 'alice@example.com',
          display_name: 'Alice IdP',
          linked_at: new Date('2026-05-27T00:00:00.000Z'),
          last_login_at: null,
          revoked_at: null,
        },
      ]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

    const start = await service.startAccountLink({
      actorTenantId: tenant.id,
      userId: linkedUser.id,
      providerCode: provider.code,
      next: '/tenant/tenant-1/profile/security',
    });
    const state = new URL(start.authorizationUrl).searchParams.get('state');
    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      subject: 'idp-subject-1',
      email: 'alice@example.com',
      displayName: 'Alice IdP',
    });
    const callbackUrl = new URL(redirectUrl);
    const linkResult = callbackUrl.searchParams.get('linkResult') || '';

    expect(callbackUrl.pathname).toBe('/login/sso/callback');
    expect(callbackUrl.search).toContain('linkResult=');
    expect(callbackUrl.search).not.toContain('access_token');
    expect(callbackUrl.search).not.toContain('id_token');
    expect(callbackUrl.search).not.toContain('alice@example.com');
    expect(linkResult).toMatch(/^ssol_/);

    const result = await service.completeAccountLink(
      tenant.schemaName,
      linkedUser.id,
      tenant.id,
      linkResult
    );

    expect(result).toEqual({
      id: '55555555-5555-4555-8555-555555555555',
      providerId: provider.id,
      providerCode: provider.code,
      providerIssuer: 'mock:mock-sso',
      email: 'alice@example.com',
      displayName: 'Alice IdP',
      linkedAt: '2026-05-27T00:00:00.000Z',
      lastLoginAt: null,
      revokedAt: null,
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_ACCOUNT_LINKED',
      'info',
      'SSO account link completed',
      expect.not.stringContaining('alice@example.com')
    );
  });

  it('denies account linking when the external subject belongs to another user', async () => {
    tenantService.getTenantById.mockResolvedValueOnce(tenant);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([provider])
      .mockResolvedValueOnce([
        {
          id: '55555555-5555-4555-8555-555555555555',
          user_id: '99999999-9999-4999-8999-999999999999',
        },
      ]);

    const start = await service.startAccountLink({
      actorTenantId: tenant.id,
      userId: linkedUser.id,
      providerCode: provider.code,
    });
    const state = new URL(start.authorizationUrl).searchParams.get('state');
    const redirectUrl = await service.handleCallback(provider.code, {
      state,
      subject: 'idp-subject-1',
    });
    const linkResult = new URL(redirectUrl).searchParams.get('linkResult') || '';

    await expect(
      service.completeAccountLink(tenant.schemaName, linkedUser.id, tenant.id, linkResult)
    ).rejects.toThrow('This external SSO subject is already linked to another TCRN account');
  });

  it('revokes account links with session revocation and audit evidence', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: '55555555-5555-4555-8555-555555555555',
        provider_id: provider.id,
        provider_code: provider.code,
        provider_issuer: 'mock:mock-sso',
      },
    ]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

    const result = await service.revokeAccountLink(
      tenant.schemaName,
      linkedUser.id,
      '55555555-5555-4555-8555-555555555555',
      {
        requestId: 'req-sso-revoke',
        traceId: 'trace-sso-revoke',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      }
    );

    expect(result).toEqual({ revoked: true, revokedSessionCount: 1 });
    expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith(linkedUser.id, tenant.schemaName);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_ACCOUNT_LINK_REVOKED',
      'info',
      'SSO account link revoked',
      expect.stringContaining('"revokedSessionCount":1')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_ACCOUNT_LINK_REVOKED',
      'info',
      'SSO account link revoked',
      expect.stringContaining('"requestId":"req-sso-revoke"')
    );
  });

  it('lets AC operators upsert fail-closed external tool SSO readiness', async () => {
    tenantService.getTenantById.mockResolvedValueOnce({ ...tenant, tier: 'ac' });
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          tool_code: 'swagger-editor',
          status: 'ready',
          required_by_phase: 'phase-2',
          provider_id: provider.id,
          fail_closed: false,
          evidence: { previous: 'linked' },
          updated_at: new Date('2026-05-26T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          tool_code: 'swagger-editor',
          status: 'blocked',
          required_by_phase: 'phase-3',
          provider_id: null,
          fail_closed: true,
          evidence: { reason: 'awaiting human SSO' },
          updated_at: new Date('2026-05-27T00:00:00.000Z'),
        },
      ]);

    const result = await service.upsertExternalToolReadiness(
      tenant.id,
      linkedUser.id,
      {
        toolCode: 'swagger-editor',
        status: 'blocked',
        requiredByPhase: 'phase-3',
        failClosed: true,
        evidence: { reason: 'awaiting human SSO' },
      },
      {
        requestId: 'req-readiness-upsert',
        traceId: 'trace-readiness-upsert',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      }
    );

    expect(result).toEqual({
      toolCode: 'swagger-editor',
      status: 'blocked',
      requiredByPhase: 'phase-3',
      providerId: null,
      failClosed: true,
      evidence: { reason: 'awaiting human SSO' },
      updatedAt: '2026-05-27T00:00:00.000Z',
    });
    expect(tenantService.getTenantById).toHaveBeenCalledWith(tenant.id);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_EXTERNAL_TOOL_READINESS_UPDATED',
      'info',
      'External tool SSO readiness updated',
      expect.stringContaining('"requestId":"req-readiness-upsert"')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_EXTERNAL_TOOL_READINESS_UPDATED',
      'info',
      'External tool SSO readiness updated',
      expect.stringContaining('"before"')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_EXTERNAL_TOOL_READINESS_UPDATED',
      'info',
      'External tool SSO readiness updated',
      expect.stringContaining('"after"')
    );
  });

  it('lists managed provider configuration with secret references redacted', async () => {
    tenantService.getTenantById.mockResolvedValueOnce(tenant);
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        ...provider,
        client_secret_ref: 'env:TEST_P3_SSO_SECRET',
      },
    ]);

    const result = await service.listManagedProviders(tenant.id);

    expect(result).toEqual([
      expect.objectContaining({
        id: provider.id,
        code: provider.code,
        ownerScope: 'tenant_product',
        clientSecretConfigured: true,
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('TEST_P3_SSO_SECRET');
  });

  it('denies ordinary tenants from managing AC platform SSO providers', async () => {
    tenantService.getTenantById.mockResolvedValueOnce(tenant);

    await expect(
      service.upsertManagedProvider(tenant.id, linkedUser.id, {
        ...provider,
        code: 'ac-sso',
        displayName: { en: 'AC SSO' },
        providerType: 'mock',
        ownerScope: 'ac_platform',
      })
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('lets AC operators upsert managed provider metadata without raw secrets', async () => {
    tenantService.getTenantById.mockResolvedValueOnce({ ...tenant, tier: 'ac' });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          ...provider,
          tenant_id: tenant.id,
          code: 'ac-sso',
          display_name: { en: 'AC SSO' },
          owner_scope: 'ac_platform',
          client_secret_ref: 'env:TEST_P3_SSO_SECRET',
        },
      ]);

    const result = await service.upsertManagedProvider(tenant.id, linkedUser.id, {
      code: 'ac-sso',
      displayName: { en: 'AC SSO' },
      providerType: 'mock',
      ownerScope: 'ac_platform',
      clientSecretRef: 'env:TEST_P3_SSO_SECRET',
      isEnabled: true,
    }, {
      requestId: 'req-provider-upsert',
      traceId: 'trace-provider-upsert',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
    });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'ac-sso',
        ownerScope: 'ac_platform',
        clientSecretConfigured: true,
      })
    );
    expect(JSON.stringify(result)).not.toContain('TEST_P3_SSO_SECRET');
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'info',
      'SSO provider configuration updated',
      expect.stringContaining('"requestId":"req-provider-upsert"')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'info',
      'SSO provider configuration updated',
      expect.stringContaining('"after"')
    );
  });

  it('preserves an existing disabled provider state when isEnabled is omitted', async () => {
    tenantService.getTenantById.mockResolvedValueOnce({ ...tenant, tier: 'ac' });
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          ...provider,
          tenant_id: tenant.id,
          code: 'ac-sso',
          display_name: { en: 'AC SSO' },
          owner_scope: 'ac_platform',
          client_secret_ref: 'env:TEST_P3_SSO_SECRET',
          is_enabled: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          ...provider,
          tenant_id: tenant.id,
          code: 'ac-sso',
          display_name: { en: 'AC SSO Updated' },
          owner_scope: 'ac_platform',
          client_secret_ref: 'env:TEST_P3_SSO_SECRET',
          is_enabled: false,
        },
      ]);

    const result = await service.upsertManagedProvider(
      tenant.id,
      linkedUser.id,
      {
        code: 'ac-sso',
        displayName: { en: 'AC SSO Updated' },
        providerType: 'mock',
        ownerScope: 'ac_platform',
      },
      {
        requestId: 'req-provider-metadata',
        traceId: 'trace-provider-metadata',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      }
    );

    expect(result).toEqual(expect.objectContaining({ code: 'ac-sso', enabled: false }));
    expect(mockPrisma.$queryRawUnsafe.mock.calls[1]).toContain(false);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'warning',
      'SSO provider configuration updated',
      expect.stringContaining('"requestId":"req-provider-metadata"')
    );
    expect(JSON.stringify(mockPrisma.$executeRawUnsafe.mock.calls)).not.toContain(
      'TEST_P3_SSO_SECRET'
    );
  });

  it('audits provider disable with linked session revocation evidence', async () => {
    tenantService.getTenantById.mockResolvedValueOnce({ ...tenant, tier: 'ac' });
    mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          ...provider,
          tenant_id: tenant.id,
          code: 'ac-sso',
          display_name: { en: 'AC SSO' },
          owner_scope: 'ac_platform',
          client_secret_ref: 'env:TEST_P3_SSO_SECRET',
          is_enabled: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          ...provider,
          tenant_id: tenant.id,
          code: 'ac-sso',
          display_name: { en: 'AC SSO' },
          owner_scope: 'ac_platform',
          client_secret_ref: 'env:TEST_P3_SSO_SECRET',
          is_enabled: false,
        },
      ]);

    const result = await service.upsertManagedProvider(
      tenant.id,
      linkedUser.id,
      {
        code: 'ac-sso',
        displayName: { en: 'AC SSO' },
        providerType: 'mock',
        ownerScope: 'ac_platform',
        isEnabled: false,
      },
      {
        requestId: 'req-provider-disable',
        traceId: 'trace-provider-disable',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      }
    );

    expect(result).toEqual(expect.objectContaining({ code: 'ac-sso', enabled: false }));
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('refresh_token'),
      provider.id
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'warning',
      'SSO provider configuration updated',
      expect.stringContaining('"requestId":"req-provider-disable"')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'warning',
      'SSO provider configuration updated',
      expect.stringContaining('"revokedSessionCount":2')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'warning',
      'SSO provider configuration updated',
      expect.stringContaining('"before"')
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('technical_event_log'),
      'SSO_PROVIDER_UPSERTED',
      'warning',
      'SSO provider configuration updated',
      expect.stringContaining('"after"')
    );
    expect(JSON.stringify(mockPrisma.$executeRawUnsafe.mock.calls)).not.toContain(
      'TEST_P3_SSO_SECRET'
    );
  });

  it('denies external tool SSO readiness writes from ordinary tenants', async () => {
    tenantService.getTenantById.mockResolvedValueOnce(tenant);

    await expect(
      service.upsertExternalToolReadiness(tenant.id, linkedUser.id, {
        toolCode: 'swagger-editor',
        status: 'ready',
        failClosed: false,
      })
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
