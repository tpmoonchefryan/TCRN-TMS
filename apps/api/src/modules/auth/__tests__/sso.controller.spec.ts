import 'reflect-metadata';

import { BadRequestException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import { AuthController } from '../auth.controller';

const buildRequest = () => ({
  ip: '198.51.100.24',
  socket: { remoteAddress: '198.51.100.25' },
  get: vi.fn((name: string) => {
    const headers: Record<string, string> = {
      'user-agent': 'Vitest SSO Controller',
      'x-request-id': 'req-sso-controller',
      traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    };

    return headers[name.toLowerCase()] ?? null;
  }),
});

const currentUser = {
  id: '44444444-4444-4444-8444-444444444444',
  tenantId: '11111111-1111-4111-8111-111111111111',
  tenantSchema: 'tenant_uat',
};

const routeFor = (methodName: keyof AuthController) => {
  const handler = AuthController.prototype[methodName] as object;

  return {
    requestMethod: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
    isPublic: Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true,
    permissions:
      (Reflect.getMetadata(PERMISSIONS_KEY, handler) as
        | Array<{ resource: string; action: string }>
        | undefined) ?? [],
  };
};

describe('AuthController SSO route-level contract', () => {
  const authService = {};
  const passwordService = {};
  const totpService = {};
  const tokenService = {};
  const sessionService = {};
  const emailService = {};
  const ssoService = {
    listProviders: vi.fn(),
    startLogin: vi.fn(),
    handleCallback: vi.fn(),
    exchangeResult: vi.fn(),
    listAccountLinks: vi.fn(),
    listAccountLinkProviders: vi.fn(),
    startAccountLink: vi.fn(),
    completeAccountLink: vi.fn(),
    revokeAccountLink: vi.fn(),
    listManagedProviders: vi.fn(),
    upsertManagedProvider: vi.fn(),
    listExternalToolReadiness: vi.fn(),
    upsertExternalToolReadiness: vi.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(
      authService as never,
      passwordService as never,
      totpService as never,
      tokenService as never,
      sessionService as never,
      emailService as never,
      ssoService as never
    );
  });

  it('keeps the A2 SSO route inventory wired to the Auth controller', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
    expect(routeFor('authorize')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'oauth/authorize',
      isPublic: true,
    });
    expect(routeFor('listSsoProviders')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/providers',
      isPublic: true,
    });
    expect(routeFor('startSsoLogin')).toMatchObject({
      requestMethod: RequestMethod.POST,
      path: 'sso/start',
      isPublic: true,
    });
    expect(routeFor('handleSsoCallback')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/callback/:providerCode',
      isPublic: true,
    });
    expect(routeFor('exchangeSsoResult')).toMatchObject({
      requestMethod: RequestMethod.POST,
      path: 'sso/exchange',
      isPublic: true,
    });
    expect(routeFor('listSsoAccountLinks')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/account-links',
      isPublic: false,
    });
    expect(routeFor('listSsoAccountLinkProviders')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/account-link-providers',
      isPublic: false,
    });
    expect(routeFor('startSsoAccountLink')).toMatchObject({
      requestMethod: RequestMethod.POST,
      path: 'sso/account-links/start',
      isPublic: false,
    });
    expect(routeFor('completeSsoAccountLink')).toMatchObject({
      requestMethod: RequestMethod.POST,
      path: 'sso/account-links/complete',
      isPublic: false,
    });
    expect(routeFor('revokeSsoAccountLink')).toMatchObject({
      requestMethod: RequestMethod.DELETE,
      path: 'sso/account-links/:linkId',
      isPublic: false,
    });
    expect(routeFor('listManagedSsoProviders')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/admin/providers',
      permissions: [{ resource: 'tenant.manage', action: 'read' }],
    });
    expect(routeFor('upsertManagedSsoProvider')).toMatchObject({
      requestMethod: RequestMethod.PATCH,
      path: 'sso/admin/providers/:providerCode',
      permissions: [{ resource: 'tenant.manage', action: 'update' }],
    });
    expect(routeFor('listExternalToolSsoReadiness')).toMatchObject({
      requestMethod: RequestMethod.GET,
      path: 'sso/external-tools/readiness',
      permissions: [{ resource: 'tenant.manage', action: 'read' }],
    });
    expect(routeFor('updateExternalToolSsoReadiness')).toMatchObject({
      requestMethod: RequestMethod.PATCH,
      path: 'sso/external-tools/readiness/:toolCode',
      permissions: [{ resource: 'tenant.manage', action: 'update' }],
    });
  });

  it('keeps the retired implicit OAuth authorize route fail-closed', async () => {
    await expect(controller.authorize()).rejects.toThrow(BadRequestException);
  });

  it('routes public SSO login through opaque result URLs without leaking provider secrets', async () => {
    ssoService.listProviders.mockResolvedValueOnce([
      {
        code: 'mock-sso',
        displayName: { en: 'Mock SSO' },
        clientSecretConfigured: true,
      },
    ]);
    ssoService.startLogin.mockResolvedValueOnce({
      authorizationUrl: 'https://idp.example.test/authorize?state=ssos_test',
      provider: { code: 'mock-sso' },
    });
    ssoService.handleCallback.mockResolvedValueOnce(
      'http://localhost:3000/login/sso/callback?result=ssox_test'
    );

    const providers = await controller.listSsoProviders('UAT_CORP');
    const start = await controller.startSsoLogin({
      tenantCode: 'UAT_CORP',
      providerCode: 'mock-sso',
      next: '/tenant/tenant-1/profile/security',
    });
    const res = { redirect: vi.fn() };

    await controller.handleSsoCallback(
      'mock-sso',
      { state: 'ssos_test', code: 'provider-code' },
      res as never
    );

    expect(providers).toEqual({
      success: true,
      data: [
        {
          code: 'mock-sso',
          displayName: { en: 'Mock SSO' },
          clientSecretConfigured: true,
        },
      ],
    });
    expect(JSON.stringify(providers)).not.toContain('client_secret');
    expect(start).toEqual({
      success: true,
      data: {
        authorizationUrl: 'https://idp.example.test/authorize?state=ssos_test',
        provider: { code: 'mock-sso' },
      },
    });
    expect(ssoService.listProviders).toHaveBeenCalledWith('UAT_CORP');
    expect(ssoService.startLogin).toHaveBeenCalledWith({
      tenantCode: 'UAT_CORP',
      providerCode: 'mock-sso',
      next: '/tenant/tenant-1/profile/security',
    });
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/login/sso/callback?result=ssox_test'
    );
  });

  it('exchanges SSO results into the normal auth envelope without URL or cookie leakage', async () => {
    const result = {
      type: 'success' as const,
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date('2026-05-27T01:00:00.000Z'),
      user: { id: currentUser.id, email: 'alice@example.test' },
    };
    ssoService.exchangeResult.mockResolvedValueOnce(result);
    const res = { cookie: vi.fn() };

    const response = await controller.exchangeSsoResult(
      { result: 'ssox_test' },
      buildRequest() as never,
      res as never
    );

    expect(ssoService.exchangeResult).toHaveBeenCalledWith(
      'ssox_test',
      '198.51.100.24',
      'Vitest SSO Controller'
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/api/v1' })
    );
    expect(response).toEqual({
      success: true,
      data: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: currentUser.id, email: 'alice@example.test' },
      },
    });
    expect(JSON.stringify(response)).not.toContain('refresh-token');
  });

  it('propagates service-level stale or replayed SSO result rejection', async () => {
    const rejection = new BadRequestException('stale or replayed result');
    ssoService.exchangeResult.mockRejectedValueOnce(rejection);

    await expect(
      controller.exchangeSsoResult({ result: 'ssox_replayed' }, buildRequest() as never, {
        cookie: vi.fn(),
      } as never)
    ).rejects.toBe(rejection);
  });

  it('returns SSO TOTP and password-reset envelopes without issuing refresh cookies', async () => {
    ssoService.exchangeResult
      .mockResolvedValueOnce({
        type: 'totp_required',
        sessionToken: 'sso-pre-session-totp',
        expiresIn: 300,
      })
      .mockResolvedValueOnce({
        type: 'password_reset_required',
        sessionToken: 'sso-pre-session-reset',
        expiresIn: 300,
        reason: 'forced_reset',
      });
    const totpRes = { cookie: vi.fn() };
    const resetRes = { cookie: vi.fn() };

    const totpResponse = await controller.exchangeSsoResult(
      { result: 'ssox_totp' },
      buildRequest() as never,
      totpRes as never
    );
    const resetResponse = await controller.exchangeSsoResult(
      { result: 'ssox_reset' },
      buildRequest() as never,
      resetRes as never
    );

    expect(totpResponse).toEqual({
      success: true,
      data: {
        totpRequired: true,
        sessionToken: 'sso-pre-session-totp',
        expiresIn: 300,
      },
    });
    expect(resetResponse).toEqual({
      success: true,
      data: {
        passwordResetRequired: true,
        sessionToken: 'sso-pre-session-reset',
        expiresIn: 300,
        reason: 'forced_reset',
      },
    });
    expect(totpRes.cookie).not.toHaveBeenCalled();
    expect(resetRes.cookie).not.toHaveBeenCalled();
  });

  it('scopes account-link routes to the authenticated current user only', async () => {
    ssoService.listAccountLinks.mockResolvedValueOnce([]);
    ssoService.listAccountLinkProviders.mockResolvedValueOnce([{ code: 'mock-sso' }]);
    ssoService.startAccountLink.mockResolvedValueOnce({
      authorizationUrl: 'https://idp.example.test/authorize?state=ssos_link',
    });
    ssoService.completeAccountLink.mockResolvedValueOnce({ id: 'link-1' });
    ssoService.revokeAccountLink.mockResolvedValueOnce({
      revoked: true,
      revokedSessionCount: 1,
    });

    await controller.listSsoAccountLinks(currentUser as never);
    await controller.listSsoAccountLinkProviders(currentUser as never);
    await controller.startSsoAccountLink(currentUser as never, {
      providerCode: 'mock-sso',
      next: '/tenant/tenant-1/profile/security',
    });
    await controller.completeSsoAccountLink(
      currentUser as never,
      { result: 'ssol_test' },
      buildRequest() as never
    );
    await controller.revokeSsoAccountLink(
      currentUser as never,
      'link-1',
      buildRequest() as never
    );

    expect(ssoService.listAccountLinks).toHaveBeenCalledWith('tenant_uat', currentUser.id);
    expect(ssoService.listAccountLinkProviders).toHaveBeenCalledWith(currentUser.tenantId);
    expect(ssoService.startAccountLink).toHaveBeenCalledWith({
      actorTenantId: currentUser.tenantId,
      userId: currentUser.id,
      providerCode: 'mock-sso',
      next: '/tenant/tenant-1/profile/security',
    });
    expect(ssoService.completeAccountLink).toHaveBeenCalledWith(
      'tenant_uat',
      currentUser.id,
      currentUser.tenantId,
      'ssol_test',
      expect.objectContaining({
        requestId: 'req-sso-controller',
        traceId: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
        ipAddress: '198.51.100.24',
      })
    );
    expect(ssoService.revokeAccountLink).toHaveBeenCalledWith(
      'tenant_uat',
      currentUser.id,
      'link-1',
      expect.objectContaining({ requestId: 'req-sso-controller' })
    );
  });

  it('propagates wrong-link revoke denial while preserving current-user scope', async () => {
    const rejection = new BadRequestException('SSO account link not found');
    ssoService.revokeAccountLink.mockRejectedValueOnce(rejection);

    await expect(
      controller.revokeSsoAccountLink(
        currentUser as never,
        'foreign-link',
        buildRequest() as never
      )
    ).rejects.toBe(rejection);

    expect(ssoService.revokeAccountLink).toHaveBeenCalledWith(
      'tenant_uat',
      currentUser.id,
      'foreign-link',
      expect.objectContaining({ requestId: 'req-sso-controller' })
    );
  });

  it('does not let account-link completion override the current user from request body', async () => {
    ssoService.completeAccountLink.mockRejectedValueOnce(new BadRequestException('tenant mismatch'));

    await expect(
      controller.completeSsoAccountLink(
        currentUser as never,
        {
          result: 'ssol_cross_account',
          userId: '99999999-9999-4999-8999-999999999999',
          tenantId: '22222222-2222-4222-8222-222222222222',
        } as never,
        buildRequest() as never
      )
    ).rejects.toThrow(BadRequestException);

    expect(ssoService.completeAccountLink).toHaveBeenCalledWith(
      'tenant_uat',
      currentUser.id,
      currentUser.tenantId,
      'ssol_cross_account',
      expect.any(Object)
    );
  });

  it('keeps managed-provider and external-tool readiness writes tenant scoped and redacted', async () => {
    ssoService.listManagedProviders.mockResolvedValueOnce([
      { code: 'mock-sso', clientSecretConfigured: true },
    ]);
    ssoService.upsertManagedProvider.mockResolvedValueOnce({
      code: 'mock-sso',
      clientSecretConfigured: true,
    });
    ssoService.listExternalToolReadiness.mockResolvedValueOnce([
      { toolCode: 'swagger-editor', status: 'blocked', failClosed: true },
    ]);
    ssoService.upsertExternalToolReadiness.mockResolvedValueOnce({
      toolCode: 'swagger-editor',
      status: 'ready',
      failClosed: false,
    });

    const providerList = await controller.listManagedSsoProviders(currentUser as never);
    const providerUpdate = await controller.upsertManagedSsoProvider(
      currentUser as never,
      'mock-sso',
      {
        code: 'body-code-is-ignored',
        displayName: { en: 'Mock SSO' },
        providerType: 'oidc',
        ownerScope: 'tenant_product',
        clientSecretRef: 'env:TEST_P3_SSO_SECRET',
        isEnabled: true,
      },
      buildRequest() as never
    );
    const readinessList = await controller.listExternalToolSsoReadiness(currentUser as never);
    const readinessUpdate = await controller.updateExternalToolSsoReadiness(
      currentUser as never,
      'swagger-editor',
      {
        toolCode: 'body-tool-is-ignored',
        status: 'ready',
        failClosed: false,
      },
      buildRequest() as never
    );

    expect(ssoService.listManagedProviders).toHaveBeenCalledWith(currentUser.tenantId, undefined);
    expect(ssoService.upsertManagedProvider).toHaveBeenCalledWith(
      currentUser.tenantId,
      currentUser.id,
      expect.objectContaining({
        code: 'mock-sso',
        clientSecretRef: 'env:TEST_P3_SSO_SECRET',
      }),
      expect.objectContaining({ requestId: 'req-sso-controller' })
    );
    expect(ssoService.listExternalToolReadiness).toHaveBeenCalledWith(currentUser.tenantId);
    expect(ssoService.upsertExternalToolReadiness).toHaveBeenCalledWith(
      currentUser.tenantId,
      currentUser.id,
      expect.objectContaining({
        toolCode: 'swagger-editor',
        status: 'ready',
      }),
      expect.objectContaining({ requestId: 'req-sso-controller' })
    );
    expect(JSON.stringify(providerList)).not.toContain('TEST_P3_SSO_SECRET');
    expect(JSON.stringify(providerUpdate)).not.toContain('TEST_P3_SSO_SECRET');
    expect(readinessList).toEqual({
      success: true,
      data: [{ toolCode: 'swagger-editor', status: 'blocked', failClosed: true }],
    });
    expect(readinessUpdate).toEqual({
      success: true,
      data: { toolCode: 'swagger-editor', status: 'ready', failClosed: false },
    });
  });
});
