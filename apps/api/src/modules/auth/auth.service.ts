// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import { PermissionSnapshotService } from '../permission/permission-snapshot.service';
import { TenantService } from '../tenant';

import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { AccessTokenPayload, TokenService } from './token.service';
import { TotpService } from './totp.service';

/**
 * User Info for responses
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  totpEnabled: boolean;
  forceReset: boolean;
  passwordExpiresAt: string | null;
  tenant: {
    id: string;
    name: string;
    tier: string;
    schemaName: string;
  };
}

/**
 * Login Result
 */
export interface LoginResult {
  type: 'success' | 'totp_required' | 'password_reset_required';
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserInfo;
  sessionToken?: string;
  reason?: string;
}

/**
 * Auth Service
 * Core authentication logic
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly totpService: TotpService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly tenantService: TenantService,
    private readonly permissionSnapshotService: PermissionSnapshotService,
  ) {}

  /**
   * Login with tenant, username/email and password
   */
  async login(
    tenantCode: string,
    login: string,
    password: string,
    ipAddress: string,
    userAgent?: string,
    rememberMe?: boolean,
  ): Promise<LoginResult> {
    // First, find the tenant by code
    const tenant = await this.tenantService.getTenantByCode(tenantCode);
    
    if (!tenant) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid tenant',
      });
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Tenant is disabled',
      });
    }

    // Find user in the specified tenant schema
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      password_hash: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      totp_secret: string | null;
      is_totp_enabled: boolean;
      is_active: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
      locked_until: Date | null;
    }>>(
      `SELECT 
        id, username, email, password_hash,
        display_name, avatar_url, preferred_language,
        totp_secret, is_totp_enabled, is_active,
        force_reset, password_changed_at, locked_until
      FROM "${tenant.schemaName}".system_user
      WHERE (username = $1 OR email = $1)
      LIMIT 1`,
      login,
    );

    let user: {
      id: string;
      username: string;
      email: string;
      password_hash: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      totp_secret: string | null;
      is_totp_enabled: boolean;
      is_active: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
      locked_until: Date | null;
      tenant_id: string;
      tenant_name: string;
      tenant_tier: string;
      tenant_schema: string;
    } | undefined;

    if (users.length > 0) {
      user = {
        ...users[0],
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_tier: tenant.tier,
        tenant_schema: tenant.schemaName,
      };
    }

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    const tenantSchema = user.tenant_schema;

    // Check if account is active
    if (!user.is_active) {
      await this.sessionService.logSecurityEvent(
        tenantSchema,
        'LOGIN_FAILED_DISABLED',
        user.id,
        { login },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Account is disabled',
      });
    }

    // Check if account is locked
    const lockStatus = await this.sessionService.isUserLocked(user.id, tenantSchema);
    if (lockStatus.isLocked) {
      await this.sessionService.logSecurityEvent(
        tenantSchema,
        'LOGIN_FAILED_LOCKED',
        user.id,
        { login, lockedUntil: lockStatus.lockedUntil },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_LOCKED,
        message: 'Account is locked. Please try again later.',
        details: { lockedUntil: lockStatus.lockedUntil },
      });
    }

    // Verify password
    const passwordValid = await this.passwordService.verify(password, user.password_hash);
    if (!passwordValid) {
      const attemptResult = await this.sessionService.trackLoginAttempt(
        user.id,
        tenantSchema,
        false,
        ipAddress,
      );

      await this.sessionService.logSecurityEvent(
        tenantSchema,
        'LOGIN_FAILED_PASSWORD',
        user.id,
        { login, failedCount: attemptResult.failedCount },
        ipAddress,
        userAgent,
      );

      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    // Check if password needs reset
    if (user.force_reset || this.passwordService.isPasswordExpired(user.password_changed_at)) {
      const { token, expiresIn } = this.tokenService.generatePasswordResetSessionToken({
        sub: user.id,
        tid: user.tenant_id,
        tsc: tenantSchema,
        reason: user.force_reset ? 'ADMIN_REQUIRED' : 'PASSWORD_EXPIRED',
      });

      return {
        type: 'password_reset_required',
        sessionToken: token,
        expiresIn,
        reason: user.force_reset ? 'ADMIN_REQUIRED' : 'PASSWORD_EXPIRED',
      };
    }

    // Check if TOTP is enabled
    if (user.is_totp_enabled) {
      const { token, expiresIn } = this.tokenService.generateTotpSessionToken({
        sub: user.id,
        tid: user.tenant_id,
        tsc: tenantSchema,
      });

      return {
        type: 'totp_required',
        sessionToken: token,
        expiresIn,
      };
    }

    // Successful login - generate tokens
    return this.completeLogin(user, tenantSchema, ipAddress, userAgent);
  }

  /**
   * Complete login after password (and optionally TOTP) verification
   */
  async completeLogin(
    user: {
      id: string;
      username: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      is_totp_enabled: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
      tenant_id: string;
      tenant_name: string;
      tenant_tier: string;
    },
    tenantSchema: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // Track successful login
    await this.sessionService.trackLoginAttempt(user.id, tenantSchema, true, ipAddress);

    // Refresh permission snapshots for the user (PRD §12.6)
    try {
      await this.permissionSnapshotService.refreshUserSnapshots(tenantSchema, user.id);
    } catch (error) {
      // Log but don't fail login if permission refresh fails
      this.logger.warn(`Failed to refresh permission snapshots for user ${user.id}`, error);
    }

    // Generate access token
    const { token: accessToken, expiresIn } = this.tokenService.generateAccessToken({
      sub: user.id,
      tid: user.tenant_id,
      tsc: tenantSchema,
      email: user.email,
      username: user.username,
    });

    // Generate refresh token
    await this.tokenService.generateRefreshToken(
      user.id,
      tenantSchema,
      userAgent,
      ipAddress,
    );

    // Log successful login
    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'LOGIN_SUCCESS',
      user.id,
      { username: user.username },
      ipAddress,
      userAgent,
    );

    // Calculate password expiry
    const passwordExpiresAt = user.password_changed_at
      ? this.passwordService.getPasswordExpiryDate().toISOString()
      : null;

    return {
      type: 'success',
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        preferredLanguage: user.preferred_language,
        totpEnabled: user.is_totp_enabled,
        forceReset: user.force_reset,
        passwordExpiresAt,
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name,
          tier: user.tenant_tier,
          schemaName: tenantSchema,
        },
      },
    };
  }

  /**
   * Verify TOTP code and complete login
   */
  async verifyTotp(
    sessionToken: string,
    code: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // Verify session token
    let payload;
    try {
      payload = this.tokenService.verifyTotpSessionToken(sessionToken);
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'Session expired or invalid',
      });
    }

    const tenantSchema = payload.tsc;

    // Get user with TOTP secret
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      totp_secret: string | null;
      is_totp_enabled: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
    }>>(`
      SELECT 
        id, username, email, display_name, avatar_url,
        preferred_language, totp_secret, is_totp_enabled,
        force_reset, password_changed_at
      FROM "${tenantSchema}".system_user
      WHERE id = $1
    `, payload.sub);

    if (users.length === 0 || !users[0].totp_secret) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOTP_NOT_ENABLED,
        message: 'TOTP is not enabled for this account',
      });
    }

    const user = users[0];

    // Verify TOTP code
    const isValid = this.totpService.verify(code, user.totp_secret);
    if (!isValid) {
      await this.sessionService.logSecurityEvent(
        tenantSchema,
        'TOTP_VERIFICATION_FAILED',
        user.id,
        {},
        ipAddress,
        userAgent,
      );

      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOTP_INVALID,
        message: 'Invalid TOTP code',
      });
    }

    // Get tenant info
    const tenant = await this.tenantService.getTenantById(payload.tid);
    if (!tenant) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return this.completeLogin(
      {
        ...user,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_tier: tenant.tier,
      },
      tenantSchema,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Verify recovery code and complete login
   */
  async verifyRecoveryCode(
    sessionToken: string,
    recoveryCode: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult & { recoveryCodesRemaining: number; warning: string }> {
    // Verify session token
    let payload;
    try {
      payload = this.tokenService.verifyTotpSessionToken(sessionToken);
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'Session expired or invalid',
      });
    }

    const tenantSchema = payload.tsc;

    // Find matching recovery code
    const codes = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code_hash: string;
      is_used: boolean;
    }>>(`
      SELECT id, code_hash, is_used
      FROM "${tenantSchema}".recovery_code
      WHERE user_id = $1::uuid AND is_used = false
    `, payload.sub);

    let matchedCodeId: string | null = null;
    for (const code of codes) {
      if (this.totpService.verifyRecoveryCode(recoveryCode, code.code_hash)) {
        matchedCodeId = code.id;
        break;
      }
    }

    if (!matchedCodeId) {
      await this.sessionService.logSecurityEvent(
        tenantSchema,
        'RECOVERY_CODE_INVALID',
        payload.sub,
        {},
        ipAddress,
        userAgent,
      );

      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_RECOVERY_CODE_INVALID,
        message: 'Invalid or already used recovery code',
      });
    }

    // Mark code as used
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".recovery_code
      SET is_used = true, used_at = now()
      WHERE id = $1::uuid
    `, matchedCodeId);

    // Count remaining codes
    const remainingResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${tenantSchema}".recovery_code
      WHERE user_id = $1::uuid AND is_used = false
    `, payload.sub);
    const remaining = Number(remainingResult[0]?.count || 0);

    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'RECOVERY_CODE_USED',
      payload.sub,
      { remaining },
      ipAddress,
      userAgent,
    );

    // Get user info
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      is_totp_enabled: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
    }>>(`
      SELECT 
        id, username, email, display_name, avatar_url,
        preferred_language, is_totp_enabled, force_reset, password_changed_at
      FROM "${tenantSchema}".system_user
      WHERE id = $1
    `, payload.sub);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const tenant = await this.tenantService.getTenantById(payload.tid);
    if (!tenant) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const loginResult = await this.completeLogin(
      {
        ...users[0],
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_tier: tenant.tier,
      },
      tenantSchema,
      ipAddress,
      userAgent,
    );

    return {
      ...loginResult,
      recoveryCodesRemaining: remaining,
      warning: `You have ${remaining} recovery codes remaining. Please regenerate them soon.`,
    };
  }

  /**
   * Complete login after password reset
   */
  async completeLoginAfterReset(
    userId: string,
    tenantSchema: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // Get user info
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      is_totp_enabled: boolean;
      force_reset: boolean;
      password_changed_at: Date | null;
    }>>(`
      SELECT 
        id, username, email, display_name, avatar_url,
        preferred_language, is_totp_enabled, force_reset, password_changed_at
      FROM "${tenantSchema}".system_user
      WHERE id = $1::uuid
    `, userId);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Get tenant info
    const tenant = await this.tenantService.getTenantBySchemaName(tenantSchema);
    if (!tenant) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return this.completeLogin(
      {
        ...users[0],
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_tier: tenant.tier,
      },
      tenantSchema,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    tenantSchema: string,
  ): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    // Verify refresh token
    const result = await this.tokenService.verifyRefreshToken(refreshToken, tenantSchema);
    if (!result) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
        message: 'Invalid or expired refresh token',
      });
    }

    // Use the schema extracted from token if available, otherwise use passed schema
    const targetSchema = result.schema || tenantSchema;

    // Get user info
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      is_active: boolean;
    }>>(`
      SELECT id, username, email, is_active
      FROM "${targetSchema}".system_user
      WHERE id = $1::uuid
    `, result.userId);

    if (users.length === 0 || !users[0].is_active) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Account is disabled',
      });
    }

    // Get tenant info
    const tenant = await this.tenantService.getTenantBySchemaName(targetSchema);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.TENANT_DISABLED,
        message: 'Tenant is disabled',
      });
    }

    // Generate new access token
    const { token: accessToken, expiresIn } = this.tokenService.generateAccessToken({
      sub: users[0].id,
      tid: tenant.id,
      tsc: targetSchema,
      email: users[0].email,
      username: users[0].username,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(
    userId: string,
    tenantSchema: string,
    refreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    if (refreshToken) {
      const result = await this.tokenService.verifyRefreshToken(refreshToken, tenantSchema);
      if (result) {
        await this.tokenService.revokeRefreshToken(result.tokenId, result.schema || tenantSchema);
      }
    }

    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'LOGOUT',
      userId,
      {},
      ipAddress,
      userAgent,
    );
  }

  /**
   * Logout all sessions
   */
  async logoutAll(
    userId: string,
    tenantSchema: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<number> {
    const revokedCount = await this.tokenService.revokeAllUserTokens(userId, tenantSchema);

    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'LOGOUT_ALL',
      userId,
      { revokedSessions: revokedCount },
      ipAddress,
      userAgent,
    );

    return revokedCount;
  }

  /**
   * Verify access token (used by guards)
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.tokenService.verifyAccessToken(token);
  }
}
