// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';
import { Request, Response } from 'express';

import { Public } from '../../common/decorators';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { randomBytes } from 'crypto';

import { EmailService } from '../email/services/email.service';
import { MinioService, BUCKETS } from '../minio/minio.service';
import { AuthService } from './auth.service';
import {
  LoginDto,
  TotpVerifyDto,
  RecoveryCodeVerifyDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateUserProfileDto,
  TotpEnableDto,
  TotpDisableDto,
  RegenerateRecoveryCodesDto,
  ForceResetPasswordDto,
} from './dto/auth.dto';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly totpService: TotpService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * POST /api/v1/auth/login
   * User login (step 1)
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    const result = await this.authService.login(
      dto.tenantCode,
      dto.login,
      dto.password,
      ipAddress,
      userAgent,
      dto.rememberMe,
    );

    if (result.type === 'success') {
      // Set refresh token cookie
      const { token: refreshToken, expiresAt } = await this.tokenService.generateRefreshToken(
        result.user!.id,
        result.user!.tenant.schemaName,
        userAgent,
        ipAddress,
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth',
      });

      return success({
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    }

    if (result.type === 'totp_required') {
      return success({
        totpRequired: true,
        sessionToken: result.sessionToken,
        expiresIn: result.expiresIn,
      });
    }

    if (result.type === 'password_reset_required') {
      return success({
        passwordResetRequired: true,
        sessionToken: result.sessionToken,
        expiresIn: result.expiresIn,
        reason: result.reason,
      });
    }

    return result;
  }

  /**
   * POST /api/v1/auth/totp/verify
   * Verify TOTP code (step 2)
   */
  @Public()
  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code' })
  async verifyTotp(
    @Body() dto: TotpVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    const result = await this.authService.verifyTotp(
      dto.sessionToken,
      dto.code,
      ipAddress,
      userAgent,
    );

    if (result.type === 'success') {
      // Set refresh token cookie
      const { token: refreshToken, expiresAt } = await this.tokenService.generateRefreshToken(
        result.user!.id,
        result.user!.tenant.schemaName,
        userAgent,
        ipAddress,
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth',
      });
    }

    return success({
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }

  /**
   * POST /api/v1/auth/password/reset
   * Reset password using session token (for force reset flow)
   */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password (force reset flow)' })
  async forceResetPassword(
    @Body() dto: ForceResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    // Validate passwords match
    if (dto.newPassword !== dto.newPasswordConfirm) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Passwords do not match',
      });
    }

    // Validate password complexity
    const validation = this.passwordService.validate(dto.newPassword);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_WEAK,
        message: 'Password does not meet requirements',
        details: { errors: validation.errors },
      });
    }

    // Verify session token
    let payload;
    try {
      payload = this.tokenService.verifyPasswordResetSessionToken(dto.sessionToken);
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_SESSION_INVALID,
        message: 'Session expired or invalid. Please login again.',
      });
    }

    const tenantSchema = payload.tsc;

    // Hash new password
    const newHash = await this.passwordService.hash(dto.newPassword);

    // Update password and clear force_reset flag
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET 
        password_hash = $2,
        password_changed_at = now(),
        force_reset = false,
        updated_at = now()
      WHERE id = $1::uuid
    `, payload.sub, newHash);

    // Log security event
    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'PASSWORD_FORCE_RESET',
      payload.sub,
      { reason: payload.reason },
      ipAddress,
      userAgent,
    );

    // Complete login after password reset
    const result = await this.authService.completeLoginAfterReset(
      payload.sub,
      tenantSchema,
      ipAddress,
      userAgent,
    );

    if (result.type === 'success') {
      // Set refresh token cookie
      const { token: refreshToken, expiresAt } = await this.tokenService.generateRefreshToken(
        result.user!.id,
        result.user!.tenant.schemaName,
        userAgent,
        ipAddress,
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth',
      });
    }

    return success({
      message: 'Password reset successfully',
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset via email
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset via email' })
  async forgotPassword(
    @Body() dto: { email: string; tenantCode: string },
    @Req() req: Request,
  ) {
    const { email, tenantCode } = dto;

    // Validate input
    if (!email || !tenantCode) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Email and tenant code are required',
      });
    }

    // Find tenant
    const tenants = await prisma.tenant.findMany({
      where: { code: tenantCode.toUpperCase(), isActive: true },
    });

    if (tenants.length === 0) {
      // Return success even if tenant not found (security: don't reveal tenant existence)
      return success({
        message: 'If the email is registered, a password reset link will be sent',
      });
    }

    const tenant = tenants[0];
    const tenantSchema = tenant.schemaName;

    // Find user by email
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      email: string;
      display_name: string | null;
      username: string;
      preferred_language: string | null;
      is_active: boolean;
    }>>(`
      SELECT id, email, display_name, username, preferred_language, is_active
      FROM "${tenantSchema}".system_user 
      WHERE email = $1
    `, email.toLowerCase());

    if (users.length === 0 || !users[0].is_active) {
      // Return success even if user not found (security: don't reveal user existence)
      return success({
        message: 'If the email is registered, a password reset link will be sent',
      });
    }

    const user = users[0];

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate existing requests
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".password_reset_request 
      WHERE user_id = $1::uuid AND used_at IS NULL
    `, user.id);

    // Create new request
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".password_reset_request 
        (id, user_id, email, token, expires_at, created_at)
      VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, now())
    `, user.id, email.toLowerCase(), token, expiresAt);

    // Build reset link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password-email?token=${token}&tenant=${tenantCode}`;

    // Send email
    try {
      await this.emailService.sendSystemEmail(
        email,
        'password_reset',
        user.preferred_language || 'en',
        {
          userName: user.display_name || user.username,
          resetLink,
          expiresIn: '1 hour',
        },
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw - still return success for security
    }

    // Log event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'PASSWORD_RESET_REQUESTED',
      user.id,
      { email },
      ipAddress,
      userAgent,
    );

    return success({
      message: 'If the email is registered, a password reset link will be sent',
    });
  }

  /**
   * POST /api/v1/auth/reset-password-by-token
   * Reset password using email token
   */
  @Public()
  @Post('reset-password-by-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using email token' })
  async resetPasswordByToken(
    @Body() dto: { token: string; tenantCode: string; newPassword: string; newPasswordConfirm: string },
    @Req() req: Request,
  ) {
    const { token, tenantCode, newPassword, newPasswordConfirm } = dto;

    // Validate input
    if (!token || !tenantCode || !newPassword || !newPasswordConfirm) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'All fields are required',
      });
    }

    // Validate passwords match
    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Passwords do not match',
      });
    }

    // Validate password complexity
    const validation = this.passwordService.validate(newPassword);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_WEAK,
        message: 'Password does not meet requirements',
        details: { errors: validation.errors },
      });
    }

    // Find tenant
    const tenants = await prisma.tenant.findMany({
      where: { code: tenantCode.toUpperCase(), isActive: true },
    });

    if (tenants.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid or expired reset link',
      });
    }

    const tenant = tenants[0];
    const tenantSchema = tenant.schemaName;

    // Find reset request
    const requests = await prisma.$queryRawUnsafe<Array<{
      id: string;
      user_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>>(`
      SELECT id, user_id, expires_at, used_at
      FROM "${tenantSchema}".password_reset_request 
      WHERE token = $1
    `, token);

    if (requests.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid or expired reset link',
      });
    }

    const request = requests[0];

    // Check if already used
    if (request.used_at) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'This reset link has already been used',
      });
    }

    // Check if expired
    if (new Date(request.expires_at) < new Date()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'This reset link has expired',
      });
    }

    // Hash new password
    const newHash = await this.passwordService.hash(newPassword);

    // Update user password
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET 
        password_hash = $2,
        password_changed_at = now(),
        force_reset = false,
        updated_at = now()
      WHERE id = $1::uuid
    `, request.user_id, newHash);

    // Mark request as used
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".password_reset_request
      SET used_at = now()
      WHERE id = $1::uuid
    `, request.id);

    // Log event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      tenantSchema,
      'PASSWORD_RESET_BY_EMAIL',
      request.user_id,
      {},
      ipAddress,
      userAgent,
    );

    return success({
      message: 'Password reset successfully. You can now login with your new password.',
    });
  }

  /**
   * POST /api/v1/auth/recovery-code/verify
   * Verify recovery code (alternative to TOTP)
   */
  @Public()
  @Post('recovery-code/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify recovery code' })
  async verifyRecoveryCode(
    @Body() dto: RecoveryCodeVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    const result = await this.authService.verifyRecoveryCode(
      dto.sessionToken,
      dto.recoveryCode,
      ipAddress,
      userAgent,
    );

    if (result.type === 'success') {
      // Set refresh token cookie
      const { token: refreshToken, expiresAt } = await this.tokenService.generateRefreshToken(
        result.user!.id,
        result.user!.tenant.schemaName,
        userAgent,
        ipAddress,
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth',
      });
    }

    return success({
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
      recoveryCodesRemaining: result.recoveryCodesRemaining,
      warning: result.warning,
    });
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    // Get refresh token from cookie or body
    const refreshToken = dto.refreshToken || req.cookies?.refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
        message: 'No refresh token provided',
      });
    }

    // Get tenant context from cookie or header
    const tenantSchema = req.tenantContext?.schemaName || 'tenant_template';

    const result = await this.authService.refreshAccessToken(refreshToken, tenantSchema);

    return success({
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
    });
  }

  /**
   * POST /api/v1/auth/logout
   * Logout current device
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current device' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    await this.authService.logout(
      user.id,
      user.tenantSchema,
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    return success({ message: 'Logged out successfully' });
  }

  /**
   * POST /api/v1/auth/logout-all
   * Logout all devices
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');

    const revokedCount = await this.authService.logoutAll(
      user.id,
      user.tenantSchema,
      ipAddress,
      userAgent,
    );

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    return success({
      message: 'Logged out from all devices',
      revokedSessions: revokedCount,
    });
  }
}

/**
 * User Profile Controller
 */
@ApiTags('User')
@Controller('users/me')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly totpService: TotpService,
    private readonly sessionService: SessionService,
    private readonly minioService: MinioService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * GET /api/v1/users/me
   * Get current user info
   */
  @Get()
  @ApiOperation({ summary: 'Get current user info' })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string;
      username: string;
      email: string;
      phone: string | null;
      display_name: string | null;
      avatar_url: string | null;
      preferred_language: string;
      is_totp_enabled: boolean;
      force_reset: boolean;
      last_login_at: Date | null;
      password_changed_at: Date | null;
      created_at: Date;
    }>>(`
      SELECT 
        id, username, email, phone, display_name, avatar_url,
        preferred_language, is_totp_enabled, force_reset,
        last_login_at, password_changed_at, created_at
      FROM "${user.tenantSchema}".system_user
      WHERE id = $1::uuid
    `, user.id);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const userData = users[0];
    const passwordExpiresAt = userData.password_changed_at
      ? this.passwordService.getPasswordExpiryDate().toISOString()
      : null;

    return success({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      displayName: userData.display_name,
      avatarUrl: userData.avatar_url,
      preferredLanguage: userData.preferred_language,
      totpEnabled: userData.is_totp_enabled,
      forceReset: userData.force_reset,
      lastLoginAt: userData.last_login_at?.toISOString() || null,
      passwordChangedAt: userData.password_changed_at?.toISOString() || null,
      passwordExpiresAt,
      createdAt: userData.created_at.toISOString(),
    });
  }

  /**
   * PATCH /api/v1/users/me
   * Update current user profile
   */
  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserProfileDto,
  ) {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 2; // $1 is user.id

    if (dto.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(dto.displayName);
    }
    if (dto.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(dto.phone);
    }
    if (dto.preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(dto.preferredLanguage);
    }
    if (dto.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(dto.avatarUrl);
    }

    if (updates.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No fields to update',
      });
    }

    updates.push('updated_at = now()');

    await prisma.$executeRawUnsafe(
      `UPDATE "${user.tenantSchema}".system_user SET ${updates.join(', ')} WHERE id = $1::uuid`,
      user.id,
      ...values,
    );

    return this.getCurrentUser(user);
  }

  /**
   * POST /api/v1/users/me/password
   * Change password
   */
  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    // Validate passwords match
    if (dto.newPassword !== dto.newPasswordConfirm) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'New passwords do not match',
      });
    }

    // Validate password complexity
    const validation = this.passwordService.validate(dto.newPassword);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_WEAK,
        message: 'Password does not meet requirements',
        details: { errors: validation.errors },
      });
    }

    // Get current password hash
    const users = await prisma.$queryRawUnsafe<Array<{ password_hash: string }>>(`
      SELECT password_hash FROM "${user.tenantSchema}".system_user WHERE id = $1
    `, user.id);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Verify current password
    const isValid = await this.passwordService.verify(dto.currentPassword, users[0].password_hash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is same as old
    const isSame = await this.passwordService.isSamePassword(dto.newPassword, users[0].password_hash);
    if (isSame) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_SAME,
        message: 'New password must be different from current password',
      });
    }

    // Hash new password
    const newHash = await this.passwordService.hash(dto.newPassword);

    // Update password
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET 
        password_hash = $2,
        password_changed_at = now(),
        force_reset = false,
        updated_at = now()
      WHERE id = $1
    `, user.id, newHash);

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'PASSWORD_CHANGED',
      user.id,
      {},
      ipAddress,
      userAgent,
    );

    const expiresAt = this.passwordService.getPasswordExpiryDate();

    return success({
      message: 'Password changed successfully',
      passwordExpiresAt: expiresAt.toISOString(),
    });
  }

  /**
   * POST /api/v1/users/me/totp/setup
   * Initialize TOTP setup
   */
  @Post('totp/setup')
  @ApiOperation({ summary: 'Initialize TOTP setup' })
  async setupTotp(@CurrentUser() user: AuthenticatedUser) {
    // Check if TOTP is already enabled
    const users = await prisma.$queryRawUnsafe<Array<{ is_totp_enabled: boolean }>>(`
      SELECT is_totp_enabled FROM "${user.tenantSchema}".system_user WHERE id = $1
    `, user.id);

    if (users.length > 0 && users[0].is_totp_enabled) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_ALREADY_ENABLED,
        message: 'TOTP is already enabled',
      });
    }

    // Generate TOTP setup info
    const setupInfo = await this.totpService.generateSetupInfo(user.email);

    // Store secret temporarily (will be saved on enable)
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET totp_secret = $2, updated_at = now()
      WHERE id = $1
    `, user.id, setupInfo.secret);

    return success({
      secret: setupInfo.secret,
      qrCode: setupInfo.qrCode,
      otpauthUrl: setupInfo.otpauthUrl,
      issuer: setupInfo.issuer,
      account: setupInfo.account,
    });
  }

  /**
   * POST /api/v1/users/me/totp/enable
   * Enable TOTP (requires verification)
   */
  @Post('totp/enable')
  @ApiOperation({ summary: 'Enable TOTP' })
  async enableTotp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TotpEnableDto,
    @Req() req: Request,
  ) {
    // Get stored secret
    const users = await prisma.$queryRawUnsafe<Array<{ 
      totp_secret: string | null;
      is_totp_enabled: boolean;
    }>>(`
      SELECT totp_secret, is_totp_enabled 
      FROM "${user.tenantSchema}".system_user 
      WHERE id = $1
    `, user.id);

    if (users.length === 0 || !users[0].totp_secret) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_NOT_ENABLED,
        message: 'TOTP setup not initialized. Call /totp/setup first.',
      });
    }

    if (users[0].is_totp_enabled) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_ALREADY_ENABLED,
        message: 'TOTP is already enabled',
      });
    }

    // Verify code
    const isValid = this.totpService.verify(dto.code, users[0].totp_secret);
    if (!isValid) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_INVALID,
        message: 'Invalid TOTP code',
      });
    }

    // Generate recovery codes
    const recoveryCodes = this.totpService.generateRecoveryCodes(10);

    // Enable TOTP
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET is_totp_enabled = true, totp_enabled_at = now(), updated_at = now()
      WHERE id = $1
    `, user.id);

    // Store recovery codes
    for (const code of recoveryCodes) {
      const hash = this.totpService.hashRecoveryCode(code);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${user.tenantSchema}".recovery_code 
          (id, user_id, code_hash, is_used, created_at)
        VALUES (gen_random_uuid(), $1, $2, false, now())
      `, user.id, hash);
    }

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'TOTP_ENABLED',
      user.id,
      {},
      ipAddress,
      userAgent,
    );

    return success({
      enabled: true,
      enabledAt: new Date().toISOString(),
      recoveryCodes,
      warning: 'Save these recovery codes in a safe place. Each code can only be used once and cannot be viewed again.',
    });
  }

  /**
   * POST /api/v1/users/me/totp/disable
   * Disable TOTP
   */
  @Post('totp/disable')
  @ApiOperation({ summary: 'Disable TOTP' })
  async disableTotp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TotpDisableDto,
    @Req() req: Request,
  ) {
    // Get current password hash and TOTP status
    const users = await prisma.$queryRawUnsafe<Array<{
      password_hash: string;
      is_totp_enabled: boolean;
    }>>(`
      SELECT password_hash, is_totp_enabled 
      FROM "${user.tenantSchema}".system_user 
      WHERE id = $1
    `, user.id);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!users[0].is_totp_enabled) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_NOT_ENABLED,
        message: 'TOTP is not enabled',
      });
    }

    // Verify password
    const isValid = await this.passwordService.verify(dto.password, users[0].password_hash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Password is incorrect',
      });
    }

    // Disable TOTP
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET 
        is_totp_enabled = false, 
        totp_secret = NULL, 
        totp_enabled_at = NULL,
        updated_at = now()
      WHERE id = $1
    `, user.id);

    // Delete recovery codes
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${user.tenantSchema}".recovery_code WHERE user_id = $1
    `, user.id);

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'TOTP_DISABLED',
      user.id,
      {},
      ipAddress,
      userAgent,
    );

    return success({
      enabled: false,
      disabledAt: new Date().toISOString(),
    });
  }

  /**
   * POST /api/v1/users/me/recovery-codes
   * Regenerate recovery codes
   */
  @Post('recovery-codes')
  @ApiOperation({ summary: 'Regenerate recovery codes' })
  async regenerateRecoveryCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegenerateRecoveryCodesDto,
    @Req() req: Request,
  ) {
    // Verify password
    const users = await prisma.$queryRawUnsafe<Array<{
      password_hash: string;
      is_totp_enabled: boolean;
    }>>(`
      SELECT password_hash, is_totp_enabled 
      FROM "${user.tenantSchema}".system_user 
      WHERE id = $1
    `, user.id);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!users[0].is_totp_enabled) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_TOTP_NOT_ENABLED,
        message: 'TOTP is not enabled. Enable TOTP first.',
      });
    }

    const isValid = await this.passwordService.verify(dto.password, users[0].password_hash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Password is incorrect',
      });
    }

    // Delete old recovery codes
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${user.tenantSchema}".recovery_code WHERE user_id = $1
    `, user.id);

    // Generate new recovery codes
    const recoveryCodes = this.totpService.generateRecoveryCodes(10);

    // Store new codes
    for (const code of recoveryCodes) {
      const hash = this.totpService.hashRecoveryCode(code);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${user.tenantSchema}".recovery_code 
          (id, user_id, code_hash, is_used, created_at)
        VALUES (gen_random_uuid(), $1, $2, false, now())
      `, user.id, hash);
    }

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'RECOVERY_CODES_REGENERATED',
      user.id,
      {},
      ipAddress,
      userAgent,
    );

    return success({
      recoveryCodes,
      warning: 'All previous recovery codes have been invalidated. Save these new codes in a safe place.',
    });
  }

  /**
   * GET /api/v1/users/me/sessions
   * Get active sessions
   */
  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.sessionService.getUserSessions(
      user.id,
      user.tenantSchema,
    );

    return success(sessions);
  }

  /**
   * DELETE /api/v1/users/me/sessions/:id
   * Revoke a session
   */
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Req() req: Request,
  ) {
    const revoked = await this.sessionService.revokeSession(
      sessionId,
      user.id,
      user.tenantSchema,
    );

    if (!revoked) {
      throw new BadRequestException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Session not found or already revoked',
      });
    }

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'SESSION_REVOKED',
      user.id,
      { revokedSessionId: sessionId },
      ipAddress,
      userAgent,
    );

    return success({ message: 'Session revoked successfully' });
  }

  // ==========================================================================
  // Avatar Management
  // ==========================================================================

  /**
   * POST /api/v1/users/me/avatar
   * Upload user avatar
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No file uploaded',
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid file type. Allowed: jpg, png, gif, webp',
      });
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'File too large. Maximum size: 2MB',
      });
    }

    // Generate unique filename
    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectName = `${user.id}/${Date.now()}.${ext}`;

    // Get current avatar URL to delete old one later
    const currentUsers = await prisma.$queryRawUnsafe<Array<{ avatar_url: string | null }>>(`
      SELECT avatar_url FROM "${user.tenantSchema}".system_user WHERE id = $1
    `, user.id);
    const oldAvatarUrl = currentUsers[0]?.avatar_url;

    // Upload to MinIO
    await this.minioService.uploadFile(
      BUCKETS.AVATARS,
      objectName,
      file.buffer,
      file.mimetype,
    );

    // Generate public URL
    const avatarUrl = await this.minioService.getPresignedUrl(
      BUCKETS.AVATARS,
      objectName,
      60 * 60 * 24 * 365 // 1 year expiry for avatar URLs
    );

    // Update user avatar_url
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET avatar_url = $2, updated_at = now()
      WHERE id = $1
    `, user.id, avatarUrl);

    // Delete old avatar if it was stored in MinIO
    if (oldAvatarUrl && oldAvatarUrl.includes(BUCKETS.AVATARS)) {
      try {
        // Extract object name from URL (format: .../avatars/userId/timestamp.ext)
        const urlParts = oldAvatarUrl.split(`${BUCKETS.AVATARS}/`);
        if (urlParts[1]) {
          const oldObjectName = urlParts[1].split('?')[0]; // Remove query params
          await this.minioService.deleteFile(BUCKETS.AVATARS, oldObjectName);
        }
      } catch {
        // Ignore deletion errors
      }
    }

    return success({
      avatarUrl,
      message: 'Avatar uploaded successfully',
    });
  }

  /**
   * DELETE /api/v1/users/me/avatar
   * Delete user avatar
   */
  @Delete('avatar')
  @ApiOperation({ summary: 'Delete user avatar' })
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    // Get current avatar URL
    const users = await prisma.$queryRawUnsafe<Array<{ avatar_url: string | null }>>(`
      SELECT avatar_url FROM "${user.tenantSchema}".system_user WHERE id = $1
    `, user.id);

    if (users.length === 0) {
      throw new UnauthorizedException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const avatarUrl = users[0].avatar_url;

    // Delete from MinIO if it's stored there
    if (avatarUrl && avatarUrl.includes(BUCKETS.AVATARS)) {
      try {
        const urlParts = avatarUrl.split(`${BUCKETS.AVATARS}/`);
        if (urlParts[1]) {
          const objectName = urlParts[1].split('?')[0]; // Remove query params
          await this.minioService.deleteFile(BUCKETS.AVATARS, objectName);
        }
      } catch {
        // Ignore deletion errors
      }
    }

    // Set avatar_url to null
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET avatar_url = NULL, updated_at = now()
      WHERE id = $1
    `, user.id);

    return success({
      message: 'Avatar deleted successfully',
    });
  }

  /**
   * POST /api/v1/users/me/email/request-change
   * Request email change (sends verification email to new address)
   */
  @Post('email/request-change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email change' })
  async requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { newEmail: string },
    @Req() req: Request,
  ) {
    const { newEmail } = dto;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid email format',
      });
    }

    // Check if email is already in use
    const existingUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${user.tenantSchema}".system_user 
      WHERE email = $1 AND id != $2
    `, newEmail, user.id);

    if (existingUser.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Email is already in use',
      });
    }

    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate any existing requests for this user
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${user.tenantSchema}".email_change_request 
      WHERE user_id = $1 AND confirmed_at IS NULL
    `, user.id);

    // Create new request
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${user.tenantSchema}".email_change_request 
        (id, user_id, new_email, token, expires_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, now())
    `, user.id, newEmail, token, expiresAt);

    // Get user display name and preferred language
    const users = await prisma.$queryRawUnsafe<Array<{ display_name: string | null; username: string; preferred_language: string | null }>>(`
      SELECT display_name, username, preferred_language FROM "${user.tenantSchema}".system_user WHERE id = $1
    `, user.id);
    const userName = users[0]?.display_name || users[0]?.username || 'User';
    const preferredLanguage = users[0]?.preferred_language || 'en';

    // Get frontend base URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    // Send verification email
    try {
      await this.emailService.sendSystemEmail(
        newEmail,
        'email_change_verification',
        preferredLanguage,
        {
          userName,
          newEmail,
          verificationLink,
          expiresIn: '24 hours',
        },
      );
    } catch (error) {
      // Log error but don't expose to user
      console.error('Failed to send email change verification:', error);
      throw new BadRequestException({
        code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
        message: 'Failed to send verification email',
      });
    }

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'EMAIL_CHANGE_REQUESTED',
      user.id,
      { newEmail },
      ipAddress,
      userAgent,
    );

    return success({
      message: 'Verification email sent to new address',
    });
  }

  /**
   * POST /api/v1/users/me/email/confirm
   * Confirm email change (verify token from email)
   */
  @Post('email/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email change' })
  async confirmEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { token: string },
    @Req() req: Request,
  ) {
    const { token } = dto;

    if (!token) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Token is required',
      });
    }

    // Find the request
    const requests = await prisma.$queryRawUnsafe<Array<{
      id: string;
      new_email: string;
      expires_at: Date;
      confirmed_at: Date | null;
    }>>(`
      SELECT id, new_email, expires_at, confirmed_at 
      FROM "${user.tenantSchema}".email_change_request 
      WHERE token = $1 AND user_id = $2
    `, token, user.id);

    if (requests.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid or expired token',
      });
    }

    const request = requests[0];

    // Check if already confirmed
    if (request.confirmed_at) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Email change already confirmed',
      });
    }

    // Check if expired
    if (new Date(request.expires_at) < new Date()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Token has expired',
      });
    }

    // Check if email is still available
    const existingUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${user.tenantSchema}".system_user 
      WHERE email = $1 AND id != $2
    `, request.new_email, user.id);

    if (existingUser.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Email is no longer available',
      });
    }

    // Update user email
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".system_user
      SET email = $2, updated_at = now()
      WHERE id = $1
    `, user.id, request.new_email);

    // Mark request as confirmed
    await prisma.$executeRawUnsafe(`
      UPDATE "${user.tenantSchema}".email_change_request
      SET confirmed_at = now()
      WHERE id = $1
    `, request.id);

    // Log security event
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent');
    await this.sessionService.logSecurityEvent(
      user.tenantSchema,
      'EMAIL_CHANGED',
      user.id,
      { newEmail: request.new_email },
      ipAddress,
      userAgent,
    );

    return success({
      message: 'Email changed successfully',
      email: request.new_email,
    });
  }
}
