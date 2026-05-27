import { createHash, randomBytes, randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import { RedisService } from '../redis';
import { TenantService } from '../tenant';
import { AuthService, type LoginResult } from './auth.service';
import { TokenService } from './token.service';

const SSO_STATE_TTL_SECONDS = 300;
const SSO_EXCHANGE_TTL_SECONDS = 120;
const SSO_LINK_TTL_SECONDS = 300;
const DEFAULT_SSO_CALLBACK_PATH = '/login/sso/callback';
const SSO_OWNER_SCOPES = ['tenant_product', 'ac_platform', 'external_tool_readiness'] as const;

type SsoOwnerScope = (typeof SSO_OWNER_SCOPES)[number];
type SsoFlowPurpose = 'login' | 'account_link';

interface RawSsoProvider {
  id: string;
  tenant_id: string | null;
  tenant_code: string | null;
  tenant_name: string | null;
  tenant_tier: string | null;
  tenant_schema: string | null;
  code: string;
  display_name: Record<string, string>;
  provider_type: 'oidc' | 'mock';
  owner_scope: SsoOwnerScope;
  issuer_url: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  jwks_url: string | null;
  client_id: string | null;
  client_secret_ref: string | null;
  redirect_uri: string | null;
  scopes: string[];
  claim_mapping_policy: Record<string, string>;
  is_enabled: boolean;
}

interface SsoLoginState {
  state: string;
  purpose: SsoFlowPurpose;
  providerId: string;
  providerCode: string;
  providerType: 'oidc' | 'mock';
  providerIssuer: string;
  userId?: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  tenantTier: string;
  tenantSchema: string;
  nextPath: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  startedAt: string;
}

interface SsoExchangeRecord {
  providerId: string;
  providerCode: string;
  providerIssuer: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  tenantTier: string;
  tenantSchema: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  claimsHash: string;
  issuedAt: string;
}

interface SsoAccountLinkRecord {
  providerId: string;
  providerCode: string;
  providerIssuer: string;
  tenantId: string;
  tenantSchema: string;
  userId: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  claimsHash: string;
  issuedAt: string;
}

interface SsoClaims {
  subject: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean | null;
  raw: Record<string, unknown>;
}

export interface SsoAuditContext {
  requestId?: string | null;
  traceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

type OidcModule = {
  discovery: (...args: unknown[]) => Promise<unknown>;
  buildAuthorizationUrl: (config: unknown, parameters: Record<string, string>) => URL;
  authorizationCodeGrant: (...args: unknown[]) => Promise<unknown>;
};

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tenantService: TenantService,
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService
  ) {}

  async listProviders(tenantCode: string) {
    const tenant = await this.resolveTenant(tenantCode);
    const providers = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        SELECT
          p.id,
          p.tenant_id,
          t.code AS tenant_code,
          t.name AS tenant_name,
          t.tier AS tenant_tier,
          t.schema_name AS tenant_schema,
          p.code,
          p.display_name,
          p.provider_type,
          p.owner_scope,
          p.issuer_url,
          p.authorization_url,
          p.token_url,
          p.userinfo_url,
          p.jwks_url,
          p.client_id,
          p.client_secret_ref,
          p.redirect_uri,
          p.scopes,
          p.claim_mapping_policy,
          p.is_enabled
        FROM public.tms_sso_provider p
        JOIN public.tenant t ON t.id = p.tenant_id
        WHERE p.is_enabled = true
          AND p.tenant_id = $1::uuid
          AND (
            p.owner_scope = 'tenant_product'
            OR (p.owner_scope = 'ac_platform' AND $2 = 'ac')
          )
        ORDER BY p.owner_scope, p.code
      `,
      tenant.id,
      tenant.tier
    );

    return this.filterRuntimeProviders(providers).map((provider) => this.toProviderDiscovery(provider));
  }

  async startLogin(input: { tenantCode: string; providerCode: string; next?: string }) {
    const tenant = await this.resolveTenant(input.tenantCode);
    const provider = await this.resolveProvider(tenant.id, tenant.tier, input.providerCode);
    const state = `ssos_${randomBytes(24).toString('hex')}`;
    const nonce = randomBytes(24).toString('hex');
    const codeVerifier = randomBytes(48).toString('base64url');
    const redirectUri = this.resolveRedirectUri(provider);
    const nextPath = normalizeSafeInternalPath(input.next);

    const loginState: SsoLoginState = {
      state,
      purpose: 'login',
      providerId: provider.id,
      providerCode: provider.code,
      providerType: provider.provider_type,
      providerIssuer: this.resolveProviderIssuer(provider),
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      tenantTier: tenant.tier,
      tenantSchema: tenant.schemaName,
      nextPath,
      nonce,
      codeVerifier,
      redirectUri,
      startedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      this.stateKey(state),
      JSON.stringify(loginState),
      SSO_STATE_TTL_SECONDS
    );

    return {
      authorizationUrl:
        provider.provider_type === 'mock'
          ? this.buildMockAuthorizationUrl(provider, loginState)
          : await this.buildOidcAuthorizationUrl(provider, loginState),
      stateExpiresIn: SSO_STATE_TTL_SECONDS,
      provider: this.toProviderDiscovery(provider),
    };
  }

  async listAccountLinkProviders(actorTenantId: string) {
    const tenant = await this.resolveTenantById(actorTenantId);
    const providers = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        SELECT
          p.id,
          p.tenant_id,
          t.code AS tenant_code,
          t.name AS tenant_name,
          t.tier AS tenant_tier,
          t.schema_name AS tenant_schema,
          p.code,
          p.display_name,
          p.provider_type,
          p.owner_scope,
          p.issuer_url,
          p.authorization_url,
          p.token_url,
          p.userinfo_url,
          p.jwks_url,
          p.client_id,
          p.client_secret_ref,
          p.redirect_uri,
          p.scopes,
          p.claim_mapping_policy,
          p.is_enabled
        FROM public.tms_sso_provider p
        JOIN public.tenant t ON t.id = p.tenant_id
        WHERE p.is_enabled = true
          AND p.tenant_id = $1::uuid
          AND (
            p.owner_scope = 'tenant_product'
            OR (p.owner_scope = 'ac_platform' AND $2 = 'ac')
          )
        ORDER BY p.owner_scope, p.code
      `,
      tenant.id,
      tenant.tier
    );

    return this.filterRuntimeProviders(providers).map((provider) => this.toProviderDiscovery(provider));
  }

  async startAccountLink(input: {
    actorTenantId: string;
    userId: string;
    providerCode: string;
    next?: string;
  }) {
    const tenant = await this.resolveTenantById(input.actorTenantId);
    const provider = await this.resolveProvider(tenant.id, tenant.tier, input.providerCode);
    const state = `ssos_${randomBytes(24).toString('hex')}`;
    const nonce = randomBytes(24).toString('hex');
    const codeVerifier = randomBytes(48).toString('base64url');
    const redirectUri = this.resolveRedirectUri(provider);
    const nextPath = normalizeSafeInternalPath(input.next);

    const loginState: SsoLoginState = {
      state,
      purpose: 'account_link',
      providerId: provider.id,
      providerCode: provider.code,
      providerType: provider.provider_type,
      providerIssuer: this.resolveProviderIssuer(provider),
      userId: input.userId,
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      tenantTier: tenant.tier,
      tenantSchema: tenant.schemaName,
      nextPath,
      nonce,
      codeVerifier,
      redirectUri,
      startedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      this.stateKey(state),
      JSON.stringify(loginState),
      SSO_STATE_TTL_SECONDS
    );

    return {
      authorizationUrl:
        provider.provider_type === 'mock'
          ? this.buildMockAuthorizationUrl(provider, loginState)
          : await this.buildOidcAuthorizationUrl(provider, loginState),
      stateExpiresIn: SSO_STATE_TTL_SECONDS,
      provider: this.toProviderDiscovery(provider),
    };
  }

  async handleCallback(providerCode: string, query: Record<string, unknown>) {
    const state = typeof query.state === 'string' ? query.state : '';
    if (!state) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO state is required',
      });
    }

    const loginState = await this.consumeState(state);
    if (loginState.providerCode !== providerCode) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO provider mismatch',
      });
    }

    const provider = await this.resolveProvider(
      loginState.tenantId,
      loginState.tenantTier,
      loginState.providerCode
    );
    if (
      provider.id !== loginState.providerId ||
      this.resolveProviderIssuer(provider) !== loginState.providerIssuer
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO provider changed during authorization',
      });
    }

    const claims =
      provider.provider_type === 'mock'
        ? this.readMockClaims(query)
        : await this.exchangeOidcCallback(provider, loginState, query);

    if (loginState.purpose === 'account_link') {
      const linkCode = await this.issueAccountLinkCode(provider, loginState, claims);
      return this.buildFrontendCallbackUrl(linkCode, loginState.nextPath, 'account_link');
    }

    const exchangeCode = await this.issueExchangeCode(provider, loginState, claims);
    return this.buildFrontendCallbackUrl(exchangeCode, loginState.nextPath);
  }

  async exchangeResult(
    resultCode: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const exchangeRecord = await this.consumeExchangeCode(resultCode);
    await this.assertExchangeRecordStillValid(exchangeRecord);

    const users = await prisma.$queryRawUnsafe<
      Array<{
        link_id: string;
        id: string;
        username: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        preferred_language: string;
        is_totp_enabled: boolean;
        force_reset: boolean;
        password_changed_at: Date | null;
        is_active: boolean;
      }>
    >(
      `
        SELECT
          link.id AS link_id,
          user_record.id,
          user_record.username,
          user_record.email,
          user_record.display_name,
          user_record.avatar_url,
          user_record.preferred_language,
          user_record.is_totp_enabled,
          user_record.force_reset,
          user_record.password_changed_at,
          user_record.is_active
        FROM "${exchangeRecord.tenantSchema}".tms_sso_account_link link
        JOIN "${exchangeRecord.tenantSchema}".system_user user_record
          ON user_record.id = link.user_id
        WHERE link.provider_id = $1::uuid
          AND link.provider_issuer = $2
          AND link.subject = $3
          AND link.revoked_at IS NULL
        LIMIT 1
      `,
      exchangeRecord.providerId,
      exchangeRecord.providerIssuer,
      exchangeRecord.subject
    );

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'SSO account is not linked to a TCRN user',
      });
    }

    const user = users[0];
    if (!user.is_active) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Account is disabled',
      });
    }

    const result = await this.authService.completeLogin(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        preferred_language: user.preferred_language,
        is_totp_enabled: user.is_totp_enabled,
        force_reset: user.force_reset,
        password_changed_at: user.password_changed_at,
        tenant_id: exchangeRecord.tenantId,
        tenant_code: exchangeRecord.tenantCode,
        tenant_name: exchangeRecord.tenantName,
        tenant_tier: exchangeRecord.tenantTier,
      },
      exchangeRecord.tenantSchema,
      ipAddress,
      userAgent,
      { authMethod: 'sso', enforcePreSessionPosture: true, requirePermissionSnapshot: true }
    );

    if (result.type !== 'success') {
      return result;
    }

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${exchangeRecord.tenantSchema}".tms_sso_account_link
        SET last_login_at = now(),
            claims_hash = $2,
            email = $3,
            display_name = $4,
            updated_at = now(),
            version = version + 1
        WHERE id = $1::uuid
      `,
      user.link_id,
      exchangeRecord.claimsHash,
      exchangeRecord.email,
      exchangeRecord.displayName
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${exchangeRecord.tenantSchema}".technical_event_log
          (id, occurred_at, event_type, severity, scope, source, message, payload_json)
        VALUES
          (gen_random_uuid(), now(), 'SSO_LOGIN_SUCCESS', 'info', 'auth', 'auth.sso',
           'SSO login completed', $1::jsonb)
      `,
      JSON.stringify({
        userId: user.id,
        linkId: user.link_id,
        providerId: exchangeRecord.providerId,
        providerCode: exchangeRecord.providerCode,
        providerIssuer: exchangeRecord.providerIssuer,
      })
    );

    return result;
  }

  async listAccountLinks(tenantSchema: string, userId: string) {
    const links = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        provider_id: string;
        provider_code: string;
        provider_issuer: string;
        email: string | null;
        display_name: string | null;
        linked_at: Date;
        last_login_at: Date | null;
        revoked_at: Date | null;
      }>
    >(
      `
        SELECT
          id,
          provider_id,
          provider_code,
          provider_issuer,
          email,
          display_name,
          linked_at,
          last_login_at,
          revoked_at
        FROM "${tenantSchema}".tms_sso_account_link
        WHERE user_id = $1::uuid
        ORDER BY linked_at DESC
      `,
      userId
    );

    return links.map((link) => ({
      id: link.id,
      providerId: link.provider_id,
      providerCode: link.provider_code,
      providerIssuer: link.provider_issuer,
      email: link.email,
      displayName: link.display_name,
      linkedAt: link.linked_at.toISOString(),
      lastLoginAt: link.last_login_at?.toISOString() ?? null,
      revokedAt: link.revoked_at?.toISOString() ?? null,
    }));
  }

  async revokeAccountLink(
    tenantSchema: string,
    userId: string,
    linkId: string,
    auditContext?: SsoAuditContext
  ) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        provider_id: string;
        provider_code: string;
        provider_issuer: string;
      }>
    >(
      `
        UPDATE "${tenantSchema}".tms_sso_account_link
        SET revoked_at = COALESCE(revoked_at, now()),
            revoked_by = $2::uuid,
            updated_at = now(),
            version = version + 1
        WHERE id = $1::uuid
          AND user_id = $2::uuid
        RETURNING id, provider_id, provider_code, provider_issuer
      `,
      linkId,
      userId
    );

    if (rows.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'SSO account link not found',
      });
    }

    const revokedSessionCount = await this.tokenService.revokeAllUserTokens(userId, tenantSchema);
    const link = rows[0];
    await this.auditSsoEvent(
      tenantSchema,
      'SSO_ACCOUNT_LINK_REVOKED',
      'SSO account link revoked',
      {
        userId,
        linkId: link.id,
        providerId: link.provider_id,
        providerCode: link.provider_code,
        providerIssuer: link.provider_issuer,
        before: { revoked: false },
        after: { revoked: true },
        revokedSessionCount,
      },
      'info',
      auditContext
    );

    return { revoked: true, revokedSessionCount };
  }

  async completeAccountLink(
    tenantSchema: string,
    userId: string,
    actorTenantId: string,
    resultCode: string,
    auditContext?: SsoAuditContext
  ) {
    const record = await this.consumeAccountLinkCode(resultCode);
    if (
      record.tenantId !== actorTenantId ||
      record.tenantSchema !== tenantSchema ||
      record.userId !== userId
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO account-link result does not match the current TCRN session',
      });
    }
    await this.assertAccountLinkRecordStillValid(record);

    const activeSubjectLinks = await prisma.$queryRawUnsafe<
      Array<{ id: string; user_id: string }>
    >(
      `
        SELECT id, user_id
        FROM "${tenantSchema}".tms_sso_account_link
        WHERE provider_id = $1::uuid
          AND provider_issuer = $2
          AND subject = $3
          AND revoked_at IS NULL
        LIMIT 1
      `,
      record.providerId,
      record.providerIssuer,
      record.subject
    );

    if (activeSubjectLinks.length > 0 && activeSubjectLinks[0].user_id !== userId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'This external SSO subject is already linked to another TCRN account',
      });
    }

    const activeUserProviderLinks = await prisma.$queryRawUnsafe<
      Array<{ id: string; subject: string }>
    >(
      `
        SELECT id, subject
        FROM "${tenantSchema}".tms_sso_account_link
        WHERE user_id = $1::uuid
          AND provider_id = $2::uuid
          AND provider_issuer = $3
          AND revoked_at IS NULL
        LIMIT 1
      `,
      userId,
      record.providerId,
      record.providerIssuer
    );

    if (
      activeUserProviderLinks.length > 0 &&
      activeUserProviderLinks[0].subject !== record.subject
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'This provider is already linked to the current TCRN account',
      });
    }

    const rows =
      activeSubjectLinks.length > 0
        ? await prisma.$queryRawUnsafe<
            Array<{
              id: string;
              provider_id: string;
              provider_code: string;
              provider_issuer: string;
              email: string | null;
              display_name: string | null;
              linked_at: Date;
              last_login_at: Date | null;
              revoked_at: Date | null;
            }>
          >(
            `
              UPDATE "${tenantSchema}".tms_sso_account_link
              SET email = $2,
                  display_name = $3,
                  claims_hash = $4,
                  updated_at = now(),
                  version = version + 1
              WHERE id = $1::uuid
                AND user_id = $5::uuid
              RETURNING
                id,
                provider_id,
                provider_code,
                provider_issuer,
                email,
                display_name,
                linked_at,
                last_login_at,
                revoked_at
            `,
            activeSubjectLinks[0].id,
            record.email,
            record.displayName,
            record.claimsHash,
            userId
          )
        : await prisma.$queryRawUnsafe<
            Array<{
              id: string;
              provider_id: string;
              provider_code: string;
              provider_issuer: string;
              email: string | null;
              display_name: string | null;
              linked_at: Date;
              last_login_at: Date | null;
              revoked_at: Date | null;
            }>
          >(
            `
              INSERT INTO "${tenantSchema}".tms_sso_account_link (
                user_id,
                provider_id,
                provider_code,
                provider_issuer,
                subject,
                email,
                display_name,
                claims_hash,
                created_by,
                updated_at
              )
              VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $1::uuid, now())
              RETURNING
                id,
                provider_id,
                provider_code,
                provider_issuer,
                email,
                display_name,
                linked_at,
                last_login_at,
                revoked_at
            `,
            userId,
            record.providerId,
            record.providerCode,
            record.providerIssuer,
            record.subject,
            record.email,
            record.displayName,
            record.claimsHash
          );

    const link = rows[0];
    await this.auditSsoEvent(
      tenantSchema,
      'SSO_ACCOUNT_LINKED',
      'SSO account link completed',
      {
        userId,
        providerId: record.providerId,
        providerCode: record.providerCode,
        providerIssuer: record.providerIssuer,
        linkId: link.id,
        before: { linked: activeSubjectLinks.length > 0 },
        after: { linked: true },
      },
      'info',
      auditContext
    );

    return {
      id: link.id,
      providerId: link.provider_id,
      providerCode: link.provider_code,
      providerIssuer: link.provider_issuer,
      email: link.email,
      displayName: link.display_name,
      linkedAt: link.linked_at.toISOString(),
      lastLoginAt: link.last_login_at?.toISOString() ?? null,
      revokedAt: link.revoked_at?.toISOString() ?? null,
    };
  }

  async listManagedProviders(actorTenantId: string, ownerScope?: string) {
    const actorTenant = await this.resolveTenantById(actorTenantId);
    const allowedScopes = this.allowedManagedProviderScopesForTenant(actorTenant);
    const requestedScopes = ownerScope
      ? [this.requireAllowedOwnerScope(ownerScope, allowedScopes)]
      : allowedScopes;

    const providers = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        SELECT
          p.id,
          p.tenant_id,
          t.code AS tenant_code,
          t.name AS tenant_name,
          t.tier AS tenant_tier,
          t.schema_name AS tenant_schema,
          p.code,
          p.display_name,
          p.provider_type,
          p.owner_scope,
          p.issuer_url,
          p.authorization_url,
          p.token_url,
          p.userinfo_url,
          p.jwks_url,
          p.client_id,
          p.client_secret_ref,
          p.redirect_uri,
          p.scopes,
          p.claim_mapping_policy,
          p.is_enabled
        FROM public.tms_sso_provider p
        JOIN public.tenant t ON t.id = p.tenant_id
        WHERE p.tenant_id = $1::uuid
          AND p.owner_scope = ANY($2::text[])
        ORDER BY p.owner_scope, p.code
      `,
      actorTenantId,
      requestedScopes
    );

    return this.filterRuntimeProviders(providers).map((provider) => this.toManagedProvider(provider));
  }

  async upsertManagedProvider(
    actorTenantId: string,
    actorUserId: string,
    input: {
      code: string;
      displayName: Record<string, string>;
      providerType: 'oidc' | 'mock';
      ownerScope: SsoOwnerScope;
      issuerUrl?: string | null;
      authorizationUrl?: string | null;
      tokenUrl?: string | null;
      userinfoUrl?: string | null;
      jwksUrl?: string | null;
      clientId?: string | null;
      clientSecretRef?: string | null;
      redirectUri?: string | null;
      scopes?: string[];
      claimMappingPolicy?: Record<string, string>;
      isEnabled?: boolean;
    },
    auditContext?: SsoAuditContext
  ) {
    if (input.providerType === 'mock' && !this.isMockSsoRuntimeAllowed()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Mock SSO providers are available only in isolated test runtimes',
      });
    }

    const actorTenant = await this.resolveTenantById(actorTenantId);
    const allowedScopes = this.allowedManagedProviderScopesForTenant(actorTenant);
    const ownerScope = this.requireAllowedOwnerScope(input.ownerScope, allowedScopes);
    const code = normalizeProviderCode(input.code);
    const existingProviderRows = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        SELECT
          p.id,
          p.tenant_id,
          NULL::text AS tenant_code,
          NULL::text AS tenant_name,
          NULL::text AS tenant_tier,
          NULL::text AS tenant_schema,
          p.code,
          p.display_name,
          p.provider_type,
          p.owner_scope,
          p.issuer_url,
          p.authorization_url,
          p.token_url,
          p.userinfo_url,
          p.jwks_url,
          p.client_id,
          p.client_secret_ref,
          p.redirect_uri,
          p.scopes,
          p.claim_mapping_policy,
          p.is_enabled
        FROM public.tms_sso_provider p
        WHERE p.tenant_id = $1::uuid
          AND p.code = $2
        LIMIT 1
      `,
      actorTenantId,
      code
    );
    const existingProvider = existingProviderRows[0] ?? null;
    const clientSecretRef =
      input.clientSecretRef === undefined
        ? (existingProvider?.client_secret_ref ?? null)
        : normalizeSecretRef(input.clientSecretRef);
    const isEnabled = input.isEnabled ?? existingProvider?.is_enabled ?? true;
    const scopes = input.scopes?.length ? input.scopes : ['openid', 'profile', 'email'];
    const claimMappingPolicy = {
      subject: 'sub',
      email: 'email',
      displayName: 'name',
      emailVerified: 'email_verified',
      ...(input.claimMappingPolicy ?? {}),
    };

    const rows = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        INSERT INTO public.tms_sso_provider (
          tenant_id,
          code,
          display_name,
          provider_type,
          owner_scope,
          issuer_url,
          authorization_url,
          token_url,
          userinfo_url,
          jwks_url,
          client_id,
          client_secret_ref,
          redirect_uri,
          scopes,
          claim_mapping_policy,
          is_enabled,
          created_by,
          updated_by,
          updated_at
        )
        VALUES (
          $1::uuid,
          $2,
          $3::jsonb,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::text[],
          $15::jsonb,
          $16,
          $17::uuid,
          $17::uuid,
          now()
        )
        ON CONFLICT (tenant_id, code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          provider_type = EXCLUDED.provider_type,
          owner_scope = EXCLUDED.owner_scope,
          issuer_url = EXCLUDED.issuer_url,
          authorization_url = EXCLUDED.authorization_url,
          token_url = EXCLUDED.token_url,
          userinfo_url = EXCLUDED.userinfo_url,
          jwks_url = EXCLUDED.jwks_url,
          client_id = EXCLUDED.client_id,
          client_secret_ref = EXCLUDED.client_secret_ref,
          redirect_uri = EXCLUDED.redirect_uri,
          scopes = EXCLUDED.scopes,
          claim_mapping_policy = EXCLUDED.claim_mapping_policy,
          is_enabled = EXCLUDED.is_enabled,
          updated_by = EXCLUDED.updated_by,
          updated_at = now(),
          version = tms_sso_provider.version + 1
        RETURNING
          id,
          tenant_id,
          NULL::text AS tenant_code,
          NULL::text AS tenant_name,
          NULL::text AS tenant_tier,
          NULL::text AS tenant_schema,
          code,
          display_name,
          provider_type,
          owner_scope,
          issuer_url,
          authorization_url,
          token_url,
          userinfo_url,
          jwks_url,
          client_id,
          client_secret_ref,
          redirect_uri,
          scopes,
          claim_mapping_policy,
          is_enabled
      `,
      actorTenantId,
      code,
      JSON.stringify(input.displayName),
      input.providerType,
      ownerScope,
      input.issuerUrl ?? null,
      input.authorizationUrl ?? null,
      input.tokenUrl ?? null,
      input.userinfoUrl ?? null,
      input.jwksUrl ?? null,
      input.clientId ?? null,
      clientSecretRef,
      input.redirectUri ?? null,
      scopes,
      JSON.stringify(claimMappingPolicy),
      isEnabled,
      actorUserId
    );

    const provider = rows[0];
    const revokedSessionCount = provider.is_enabled
      ? 0
      : await this.revokeProviderLinkedSessions(actorTenant.schemaName, provider.id);

    await this.auditSsoEvent(
      actorTenant.schemaName,
      'SSO_PROVIDER_UPSERTED',
      'SSO provider configuration updated',
      {
        actorUserId,
        providerId: provider.id,
        providerCode: provider.code,
        providerIssuer: this.resolveProviderIssuer(provider),
        ownerScope: provider.owner_scope,
        providerType: provider.provider_type,
        enabled: provider.is_enabled,
        clientSecretConfigured: Boolean(provider.client_secret_ref),
        before: existingProvider ? this.toProviderAuditSummary(existingProvider) : null,
        after: this.toProviderAuditSummary(provider),
        revokedSessionCount,
      },
      provider.is_enabled ? 'info' : 'warning',
      auditContext
    );

    return this.toManagedProvider(provider);
  }

  async listExternalToolReadiness(actorTenantId: string) {
    const actorTenant = await this.requireAcTenant(actorTenantId);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        tool_code: string;
        status: 'blocked' | 'ready' | 'not_applicable';
        required_by_phase: string | null;
        provider_id: string | null;
        fail_closed: boolean;
        evidence: Record<string, unknown>;
        updated_at: Date;
      }>
    >(
      `
        SELECT tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_at
        FROM public.platform_external_tool_sso_readiness
        ORDER BY tool_code
      `
    );

    return rows.map((row) => ({
      toolCode: row.tool_code,
      status: row.status,
      requiredByPhase: row.required_by_phase,
      providerId: row.provider_id,
      failClosed: row.fail_closed,
      evidence: row.evidence,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async upsertExternalToolReadiness(
    actorTenantId: string,
    actorUserId: string,
    input: {
      toolCode: string;
      status: 'blocked' | 'ready' | 'not_applicable';
      requiredByPhase?: string | null;
      providerId?: string | null;
      failClosed?: boolean;
      evidence?: Record<string, unknown>;
    },
    auditContext?: SsoAuditContext
  ) {
    const actorTenant = await this.requireAcTenant(actorTenantId);
    const existingRows = await prisma.$queryRawUnsafe<
      Array<{
        tool_code: string;
        status: 'blocked' | 'ready' | 'not_applicable';
        required_by_phase: string | null;
        provider_id: string | null;
        fail_closed: boolean;
        evidence: Record<string, unknown>;
        updated_at: Date;
      }>
    >(
      `
        SELECT tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_at
        FROM public.platform_external_tool_sso_readiness
        WHERE tool_code = $1
        LIMIT 1
      `,
      input.toolCode
    );
    const existingReadiness = existingRows[0] ?? null;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        tool_code: string;
        status: 'blocked' | 'ready' | 'not_applicable';
        required_by_phase: string | null;
        provider_id: string | null;
        fail_closed: boolean;
        evidence: Record<string, unknown>;
        updated_at: Date;
      }>
    >(
      `
        INSERT INTO public.platform_external_tool_sso_readiness
          (tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_by, updated_at)
        VALUES
          ($1, $2, $3, $4::uuid, $5, $6::jsonb, $7::uuid, now())
        ON CONFLICT (tool_code) DO UPDATE SET
          status = EXCLUDED.status,
          required_by_phase = EXCLUDED.required_by_phase,
          provider_id = EXCLUDED.provider_id,
          fail_closed = EXCLUDED.fail_closed,
          evidence = EXCLUDED.evidence,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_at
      `,
      input.toolCode,
      input.status,
      input.requiredByPhase ?? null,
      input.providerId ?? null,
      input.failClosed ?? true,
      JSON.stringify(input.evidence ?? {}),
      actorUserId
    );

    const row = rows[0];
    await this.auditSsoEvent(
      actorTenant.schemaName,
      'SSO_EXTERNAL_TOOL_READINESS_UPDATED',
      'External tool SSO readiness updated',
      {
        actorUserId,
        toolCode: row.tool_code,
        status: row.status,
        requiredByPhase: row.required_by_phase,
        providerId: row.provider_id,
        failClosed: row.fail_closed,
        before: existingReadiness
          ? this.toExternalToolReadinessAuditSummary(existingReadiness)
          : null,
        after: this.toExternalToolReadinessAuditSummary(row),
      },
      'info',
      auditContext
    );

    return {
      toolCode: row.tool_code,
      status: row.status,
      requiredByPhase: row.required_by_phase,
      providerId: row.provider_id,
      failClosed: row.fail_closed,
      evidence: row.evidence,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private async resolveTenant(tenantCode: string) {
    const tenant = await this.tenantService.getTenantByCode(tenantCode);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found or disabled',
      });
    }
    return tenant;
  }

  private async resolveTenantById(tenantId: string) {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found or disabled',
      });
    }
    return tenant;
  }

  private async requireAcTenant(tenantId: string) {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant || tenant.tier !== 'ac') {
      throw new UnauthorizedException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Only AC platform operators can manage SSO readiness',
      });
    }

    return tenant;
  }

  private async resolveProvider(tenantId: string, tenantTier: string, providerCode: string) {
    const providers = await prisma.$queryRawUnsafe<RawSsoProvider[]>(
      `
        SELECT
          p.id,
          p.tenant_id,
          t.code AS tenant_code,
          t.name AS tenant_name,
          t.tier AS tenant_tier,
          t.schema_name AS tenant_schema,
          p.code,
          p.display_name,
          p.provider_type,
          p.owner_scope,
          p.issuer_url,
          p.authorization_url,
          p.token_url,
          p.userinfo_url,
          p.jwks_url,
          p.client_id,
          p.client_secret_ref,
          p.redirect_uri,
          p.scopes,
          p.claim_mapping_policy,
          p.is_enabled
        FROM public.tms_sso_provider p
        JOIN public.tenant t ON t.id = p.tenant_id
        WHERE p.code = $1
          AND p.is_enabled = true
          AND p.tenant_id = $2::uuid
          AND (
            p.owner_scope = 'tenant_product'
            OR (p.owner_scope = 'ac_platform' AND $3 = 'ac')
          )
        LIMIT 1
      `,
      providerCode,
      tenantId,
      tenantTier
    );

    if (providers.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'SSO provider is not available',
      });
    }

    this.assertProviderRuntimeAllowed(providers[0]);
    return providers[0];
  }

  private filterRuntimeProviders(providers: RawSsoProvider[]) {
    return providers.filter((provider) => this.isProviderRuntimeAllowed(provider));
  }

  private assertProviderRuntimeAllowed(provider: RawSsoProvider) {
    if (!this.isProviderRuntimeAllowed(provider)) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'SSO provider is not available',
      });
    }
  }

  private isProviderRuntimeAllowed(provider: RawSsoProvider) {
    return provider.provider_type !== 'mock' || this.isMockSsoRuntimeAllowed();
  }

  private isMockSsoRuntimeAllowed() {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    const flag =
      this.configService.get<string>('TCRN_ALLOW_MOCK_SSO') ??
      process.env.TCRN_ALLOW_MOCK_SSO ??
      '';

    return nodeEnv === 'test' || (nodeEnv === 'development' && flag === 'true');
  }

  private resolveProviderIssuer(provider: RawSsoProvider) {
    return (
      provider.issuer_url ||
      provider.authorization_url ||
      provider.jwks_url ||
      `${provider.provider_type}:${provider.code}`
    );
  }

  private toProviderDiscovery(provider: RawSsoProvider) {
    return {
      id: provider.id,
      code: provider.code,
      displayName: provider.display_name,
      providerType: provider.provider_type,
      ownerScope: provider.owner_scope,
      enabled: provider.is_enabled,
    };
  }

  private toManagedProvider(provider: RawSsoProvider) {
    return {
      id: provider.id,
      tenantId: provider.tenant_id,
      code: provider.code,
      displayName: provider.display_name,
      providerType: provider.provider_type,
      ownerScope: provider.owner_scope,
      issuerUrl: provider.issuer_url,
      authorizationUrl: provider.authorization_url,
      tokenUrl: provider.token_url,
      userinfoUrl: provider.userinfo_url,
      jwksUrl: provider.jwks_url,
      clientId: provider.client_id,
      clientSecretConfigured: Boolean(provider.client_secret_ref),
      redirectUri: provider.redirect_uri,
      scopes: provider.scopes,
      claimMappingPolicy: provider.claim_mapping_policy,
      enabled: provider.is_enabled,
    };
  }

  private allowedManagedProviderScopesForTenant(tenant: { tier: string }): SsoOwnerScope[] {
    if (tenant.tier === 'ac') {
      return [...SSO_OWNER_SCOPES];
    }

    return ['tenant_product'];
  }

  private requireAllowedOwnerScope(scope: string, allowedScopes: SsoOwnerScope[]): SsoOwnerScope {
    if (!SSO_OWNER_SCOPES.includes(scope as SsoOwnerScope)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Unsupported SSO owner scope',
      });
    }

    const ownerScope = scope as SsoOwnerScope;
    if (!allowedScopes.includes(ownerScope)) {
      throw new UnauthorizedException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'SSO provider scope is not available for this tenant',
      });
    }

    return ownerScope;
  }

  private async consumeState(state: string): Promise<SsoLoginState> {
    const key = this.stateKey(state);
    const stored = await this.redisService.getdel(key);
    if (!stored) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO state expired or invalid',
      });
    }
    return JSON.parse(stored) as SsoLoginState;
  }

  private async consumeExchangeCode(resultCode: string): Promise<SsoExchangeRecord> {
    const key = this.exchangeKey(resultCode);
    const stored = await this.redisService.getdel(key);
    if (!stored) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO result expired or invalid',
      });
    }
    return JSON.parse(stored) as SsoExchangeRecord;
  }

  private async consumeAccountLinkCode(resultCode: string): Promise<SsoAccountLinkRecord> {
    const key = this.accountLinkKey(resultCode);
    const stored = await this.redisService.getdel(key);
    if (!stored) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO account-link result expired or invalid',
      });
    }
    return JSON.parse(stored) as SsoAccountLinkRecord;
  }

  private async assertExchangeRecordStillValid(record: SsoExchangeRecord) {
    const tenant = await this.resolveTenantById(record.tenantId);
    const provider = await this.resolveProvider(tenant.id, tenant.tier, record.providerCode);

    if (
      tenant.schemaName !== record.tenantSchema ||
      tenant.code !== record.tenantCode ||
      tenant.tier !== record.tenantTier ||
      provider.id !== record.providerId ||
      this.resolveProviderIssuer(provider) !== record.providerIssuer
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO result no longer matches the active tenant/provider authority',
      });
    }
  }

  private async assertAccountLinkRecordStillValid(record: SsoAccountLinkRecord) {
    const tenant = await this.resolveTenantById(record.tenantId);
    const provider = await this.resolveProvider(tenant.id, tenant.tier, record.providerCode);

    if (
      tenant.schemaName !== record.tenantSchema ||
      provider.id !== record.providerId ||
      this.resolveProviderIssuer(provider) !== record.providerIssuer
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO account-link result no longer matches the active tenant/provider authority',
      });
    }
  }

  private async issueExchangeCode(
    provider: RawSsoProvider,
    loginState: SsoLoginState,
    claims: SsoClaims
  ) {
    const code = `ssox_${randomUUID().replace(/-/g, '')}${randomBytes(8).toString('hex')}`;
    const exchangeRecord: SsoExchangeRecord = {
      providerId: provider.id,
      providerCode: provider.code,
      providerIssuer: this.resolveProviderIssuer(provider),
      tenantId: loginState.tenantId,
      tenantCode: loginState.tenantCode,
      tenantName: loginState.tenantName,
      tenantTier: loginState.tenantTier,
      tenantSchema: loginState.tenantSchema,
      subject: claims.subject,
      email: claims.email,
      displayName: claims.displayName,
      claimsHash: hashJson(claims.raw),
      issuedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      this.exchangeKey(code),
      JSON.stringify(exchangeRecord),
      SSO_EXCHANGE_TTL_SECONDS
    );

    return code;
  }

  private async issueAccountLinkCode(
    provider: RawSsoProvider,
    loginState: SsoLoginState,
    claims: SsoClaims
  ) {
    if (!loginState.userId) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'SSO account-link state is missing the TCRN user',
      });
    }

    const code = `ssol_${randomUUID().replace(/-/g, '')}${randomBytes(8).toString('hex')}`;
    const linkRecord: SsoAccountLinkRecord = {
      providerId: provider.id,
      providerCode: provider.code,
      providerIssuer: this.resolveProviderIssuer(provider),
      tenantId: loginState.tenantId,
      tenantSchema: loginState.tenantSchema,
      userId: loginState.userId,
      subject: claims.subject,
      email: claims.email,
      displayName: claims.displayName,
      claimsHash: hashJson(claims.raw),
      issuedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      this.accountLinkKey(code),
      JSON.stringify(linkRecord),
      SSO_LINK_TTL_SECONDS
    );

    return code;
  }

  private async revokeProviderLinkedSessions(tenantSchema: string, providerId: string) {
    const result = await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".refresh_token
        SET revoked_at = now()
        WHERE revoked_at IS NULL
          AND user_id IN (
            SELECT user_id
            FROM "${tenantSchema}".tms_sso_account_link
            WHERE provider_id = $1::uuid
              AND revoked_at IS NULL
          )
      `,
      providerId
    );

    return Number(result);
  }

  private async auditSsoEvent(
    tenantSchema: string,
    eventType: string,
    message: string,
    payload: Record<string, unknown>,
    severity: 'info' | 'warning' | 'error' = 'info',
    auditContext?: SsoAuditContext
  ) {
    const normalizedContext = this.normalizeAuditContext(auditContext);
    const payloadJson = normalizedContext
      ? { ...payload, request: normalizedContext }
      : payload;
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".technical_event_log
          (id, occurred_at, event_type, severity, scope, source, message, payload_json)
        VALUES
          (gen_random_uuid(), now(), $1, $2, 'auth', 'auth.sso', $3, $4::jsonb)
      `,
      eventType,
      severity,
      message,
      JSON.stringify(payloadJson)
    );
  }

  private normalizeAuditContext(auditContext?: SsoAuditContext) {
    if (!auditContext) {
      return null;
    }

    const normalized = {
      requestId: auditContext.requestId || null,
      traceId: auditContext.traceId || null,
      ipAddress: auditContext.ipAddress || null,
      userAgent: auditContext.userAgent || null,
    };

    return Object.values(normalized).some(Boolean) ? normalized : null;
  }

  private toProviderAuditSummary(provider: RawSsoProvider) {
    return {
      providerId: provider.id,
      providerCode: provider.code,
      providerIssuer: this.resolveProviderIssuer(provider),
      ownerScope: provider.owner_scope,
      providerType: provider.provider_type,
      enabled: provider.is_enabled,
      clientIdConfigured: Boolean(provider.client_id),
      clientSecretConfigured: Boolean(provider.client_secret_ref),
      redirectUriConfigured: Boolean(provider.redirect_uri),
      scopes: provider.scopes,
    };
  }

  private toExternalToolReadinessAuditSummary(readiness: {
    tool_code: string;
    status: 'blocked' | 'ready' | 'not_applicable';
    required_by_phase: string | null;
    provider_id: string | null;
    fail_closed: boolean;
    evidence: Record<string, unknown>;
  }) {
    return {
      toolCode: readiness.tool_code,
      status: readiness.status,
      requiredByPhase: readiness.required_by_phase,
      providerId: readiness.provider_id,
      failClosed: readiness.fail_closed,
      evidenceKeys: Object.keys(readiness.evidence ?? {}).sort(),
    };
  }

  private readMockClaims(query: Record<string, unknown>): SsoClaims {
    const subject = readQueryString(query, 'subject') || readQueryString(query, 'sub');
    if (!subject) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Mock SSO subject is required',
      });
    }

    const email = readQueryString(query, 'email');
    const displayName = readQueryString(query, 'displayName') || readQueryString(query, 'name');
    const raw = {
      sub: subject,
      email,
      name: displayName,
      email_verified: readQueryString(query, 'emailVerified') === 'true',
    };

    return {
      subject,
      email,
      displayName,
      emailVerified: raw.email_verified,
      raw,
    };
  }

  private buildMockAuthorizationUrl(provider: RawSsoProvider, loginState: SsoLoginState) {
    const apiBaseUrl = this.configService.get<string>('API_PUBLIC_URL', 'http://localhost:4000');
    const url = new URL(`/api/v1/auth/sso/callback/${provider.code}`, apiBaseUrl);
    url.searchParams.set('state', loginState.state);
    url.searchParams.set('subject', 'mock-subject');
    return url.toString();
  }

  private async buildOidcAuthorizationUrl(provider: RawSsoProvider, loginState: SsoLoginState) {
    const oidc = await this.loadOidcClient();
    const config = await this.discoverOidcConfig(oidc, provider);
    const codeChallenge = createHash('sha256').update(loginState.codeVerifier).digest('base64url');

    return oidc
      .buildAuthorizationUrl(config, {
        redirect_uri: loginState.redirectUri,
        scope: provider.scopes.join(' '),
        state: loginState.state,
        nonce: loginState.nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      })
      .toString();
  }

  private async exchangeOidcCallback(
    provider: RawSsoProvider,
    loginState: SsoLoginState,
    query: Record<string, unknown>
  ): Promise<SsoClaims> {
    const code = readQueryString(query, 'code');
    if (!code) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'OIDC authorization code is required',
      });
    }

    const oidc = await this.loadOidcClient();
    const config = await this.discoverOidcConfig(oidc, provider);
    const callbackUrl = new URL(loginState.redirectUri);
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        callbackUrl.searchParams.set(key, value);
      }
    }

    const tokenSet = (await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: loginState.codeVerifier,
      expectedState: loginState.state,
      expectedNonce: loginState.nonce,
    })) as { claims?: () => Record<string, unknown> };

    const claims = typeof tokenSet.claims === 'function' ? tokenSet.claims() : {};
    return this.mapClaims(provider, claims);
  }

  private async discoverOidcConfig(oidc: OidcModule, provider: RawSsoProvider) {
    if (!provider.issuer_url || !provider.client_id) {
      throw new ServiceUnavailableException({
        code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
        message: 'OIDC provider is missing issuer or client id',
      });
    }

    const clientSecret = this.resolveClientSecret(provider.client_secret_ref);
    return oidc.discovery(
      new URL(provider.issuer_url),
      provider.client_id,
      clientSecret ? { client_secret: clientSecret } : undefined
    );
  }

  protected async loadOidcClient(): Promise<OidcModule> {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (
        specifier: string
      ) => Promise<OidcModule>;
      return await dynamicImport('openid-client');
    } catch (error) {
      this.logger.error('openid-client is unavailable for OIDC SSO', error);
      throw new ServiceUnavailableException({
        code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
        message: 'OIDC client runtime is unavailable',
      });
    }
  }

  private mapClaims(provider: RawSsoProvider, claims: Record<string, unknown>): SsoClaims {
    const policy = provider.claim_mapping_policy || {};
    const subjectKey = policy.subject || 'sub';
    const emailKey = policy.email || 'email';
    const displayNameKey = policy.displayName || 'name';
    const emailVerifiedKey = policy.emailVerified || 'email_verified';
    const subject = readClaimString(claims, subjectKey);

    if (!subject) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'SSO subject claim is missing',
      });
    }

    return {
      subject,
      email: readClaimString(claims, emailKey),
      displayName: readClaimString(claims, displayNameKey),
      emailVerified: readClaimBoolean(claims, emailVerifiedKey),
      raw: claims,
    };
  }

  private resolveRedirectUri(provider: RawSsoProvider) {
    if (provider.redirect_uri) {
      return provider.redirect_uri;
    }

    const apiBaseUrl = this.configService.get<string>('API_PUBLIC_URL', 'http://localhost:4000');
    return new URL(`/api/v1/auth/sso/callback/${provider.code}`, apiBaseUrl).toString();
  }

  private buildFrontendCallbackUrl(
    resultCode: string,
    nextPath: string,
    purpose: SsoFlowPurpose = 'login'
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const url = new URL(DEFAULT_SSO_CALLBACK_PATH, frontendUrl);
    url.searchParams.set(purpose === 'account_link' ? 'linkResult' : 'result', resultCode);
    url.searchParams.set('next', nextPath);
    return url.toString();
  }

  private resolveClientSecret(secretRef: string | null) {
    if (!secretRef) {
      return undefined;
    }

    if (!secretRef.startsWith('env:')) {
      throw new ServiceUnavailableException({
        code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
        message: 'Unsupported SSO client secret reference',
      });
    }

    const value = process.env[secretRef.slice(4)];
    if (!value) {
      throw new ServiceUnavailableException({
        code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
        message: 'SSO client secret reference is not configured',
      });
    }

    return value;
  }

  private stateKey(state: string) {
    return `sso:login-state:${state}`;
  }

  private exchangeKey(code: string) {
    return `sso:exchange:${code}`;
  }

  private accountLinkKey(code: string) {
    return `sso:account-link:${code}`;
  }
}

function normalizeSafeInternalPath(input?: string | null) {
  if (!input) {
    return '/';
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }

  return trimmed;
}

function readQueryString(query: Record<string, unknown>, key: string) {
  const value = query[key];
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }
  return typeof value === 'string' ? value : null;
}

function readClaimString(claims: Record<string, unknown>, key: string) {
  const value = claims[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function readClaimBoolean(claims: Record<string, unknown>, key: string) {
  const value = claims[key];
  return typeof value === 'boolean' ? value : null;
}

function normalizeProviderCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/.test(normalized)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'SSO provider code must use lowercase letters, numbers, hyphen, or underscore',
    });
  }

  return normalized;
}

function normalizeSecretRef(secretRef?: string | null) {
  if (!secretRef) {
    return null;
  }

  const normalized = secretRef.trim();
  if (!/^env:[A-Z0-9_]+$/.test(normalized)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'SSO client secret must be stored as an env:SECRET_NAME reference',
    });
  }

  return normalized;
}

function hashJson(payload: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
