// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

/**
 * Login Request DTO
 */
export class LoginDto {
  @ApiProperty({
    description: 'Tenant code identifying the organization',
    example: 'UAT_Corp',
  })
  @IsNotEmpty()
  @IsString()
  tenantCode: string;

  @ApiProperty({
    description: 'Username or email address',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  @IsString()
  login: string;

  @ApiProperty({
    description: 'User password',
    example: 'secret-ref:user-password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me flag for extended session (30 days)',
    example: true,
    default: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}

/**
 * Public SSO provider discovery/start request.
 */
export class StartSsoLoginDto {
  @ApiProperty({
    description: 'Tenant code identifying the organization',
    example: 'UAT_Corp',
  })
  @IsNotEmpty()
  @IsString()
  tenantCode: string;

  @ApiProperty({
    description: 'SSO provider code',
    example: 'google-workspace',
  })
  @IsNotEmpty()
  @IsString()
  providerCode: string;

  @ApiPropertyOptional({
    description: 'Safe internal path to continue after SSO login',
    example: '/tenant/tenant-123/organization',
  })
  @IsOptional()
  @IsString()
  next?: string;
}

/**
 * Exchange the one-time SSO result code for a TCRN session.
 */
export class SsoExchangeDto {
  @ApiProperty({
    description: 'One-time opaque result code returned by the SSO callback',
    example: 'ssox_4c8216f7a9d54f4e8b6c3c2d1a0f9e77',
  })
  @IsNotEmpty()
  @IsString()
  result: string;
}

/**
 * Start an authenticated current-user account-link flow.
 */
export class StartSsoAccountLinkDto {
  @ApiProperty({
    description: 'SSO provider code to link to the current TCRN account',
    example: 'google-workspace',
  })
  @IsNotEmpty()
  @IsString()
  providerCode: string;

  @ApiPropertyOptional({
    description: 'Safe internal path to return to after account linking',
    example: '/tenant/tenant-123/profile/security',
  })
  @IsOptional()
  @IsString()
  next?: string;
}

/**
 * Complete an authenticated current-user account-link flow.
 */
export class SsoAccountLinkCompleteDto {
  @ApiProperty({
    description: 'One-time opaque result code returned by the SSO account-link callback',
    example: 'ssol_4c8216f7a9d54f4e8b6c3c2d1a0f9e77',
  })
  @IsNotEmpty()
  @IsString()
  result: string;
}

export class UpsertSsoProviderDto {
  @ApiProperty({
    description: 'SSO provider code scoped to the current tenant/AC owner',
    example: 'google-workspace',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized public-safe display name',
    example: { en: 'Google Workspace', zh_HANS: 'Google Workspace' },
  })
  @IsObject()
  displayName: Record<string, string>;

  @ApiProperty({
    description: 'SSO provider type. Mock providers are reserved for isolated test runtime fixtures.',
    enum: ['oidc'],
    example: 'oidc',
  })
  @IsString()
  @IsIn(['oidc'])
  providerType: 'oidc';

  @ApiProperty({
    description: 'Provider ownership lane',
    enum: ['tenant_product', 'ac_platform', 'external_tool_readiness'],
    example: 'tenant_product',
  })
  @IsString()
  @IsIn(['tenant_product', 'ac_platform', 'external_tool_readiness'])
  ownerScope: 'tenant_product' | 'ac_platform' | 'external_tool_readiness';

  @ApiPropertyOptional({ description: 'OIDC issuer URL', example: 'https://idp.example.test' })
  @IsOptional()
  @IsString()
  issuerUrl?: string | null;

  @ApiPropertyOptional({
    description: 'OIDC authorization endpoint override',
    example: 'https://idp.example.test/oauth2/authorize',
  })
  @IsOptional()
  @IsString()
  authorizationUrl?: string | null;

  @ApiPropertyOptional({
    description: 'OIDC token endpoint override',
    example: 'https://idp.example.test/oauth2/token',
  })
  @IsOptional()
  @IsString()
  tokenUrl?: string | null;

  @ApiPropertyOptional({
    description: 'OIDC userinfo endpoint override',
    example: 'https://idp.example.test/oauth2/userinfo',
  })
  @IsOptional()
  @IsString()
  userinfoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'OIDC JWKS endpoint override',
    example: 'https://idp.example.test/.well-known/jwks.json',
  })
  @IsOptional()
  @IsString()
  jwksUrl?: string | null;

  @ApiPropertyOptional({ description: 'OIDC client id', example: 'tcrn-local' })
  @IsOptional()
  @IsString()
  clientId?: string | null;

  @ApiPropertyOptional({
    description:
      'Secret reference. Only env:NAME references are accepted; raw secrets are forbidden.',
    example: 'env:TCRN_TEST_SSO_CLIENT_SECRET',
  })
  @IsOptional()
  @IsString()
  clientSecretRef?: string | null;

  @ApiPropertyOptional({
    description: 'Provider callback URI registered with the IdP',
    example: 'http://localhost:4000/api/v1/auth/sso/callback/google-workspace',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string | null;

  @ApiPropertyOptional({
    description: 'OIDC scopes requested during login',
    example: ['openid', 'profile', 'email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Non-authoritative claim mapping policy. It cannot grant TCRN RBAC.',
    example: {
      subject: 'sub',
      email: 'email',
      displayName: 'name',
      emailVerified: 'email_verified',
    },
  })
  @IsOptional()
  @IsObject()
  claimMappingPolicy?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether this provider is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateExternalToolSsoReadinessDto {
  @ApiProperty({
    description: 'External tool code',
    example: 'swagger-editor',
  })
  @IsNotEmpty()
  @IsString()
  toolCode: string;

  @ApiProperty({
    description: 'Readiness status. Blocked means human deeplinks must fail closed.',
    enum: ['blocked', 'ready', 'not_applicable'],
    example: 'blocked',
  })
  @IsString()
  @IsIn(['blocked', 'ready', 'not_applicable'])
  status: 'blocked' | 'ready' | 'not_applicable';

  @ApiPropertyOptional({
    description: 'Phase or rollout that requires this readiness item',
    example: 'phase-4',
  })
  @IsOptional()
  @IsString()
  requiredByPhase?: string | null;

  @ApiPropertyOptional({
    description: 'SSO provider id that satisfies the readiness item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  providerId?: string | null;

  @ApiPropertyOptional({
    description: 'Whether tool human entrypoints must fail closed until SSO is ready',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  failClosed?: boolean;

  @ApiPropertyOptional({
    description: 'Non-secret acceptance evidence metadata',
    example: { source: 'phase-3-acceptance' },
  })
  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}

/**
 * TOTP Verify Request DTO
 */
export class TotpVerifyDto {
  @ApiProperty({
    description: 'Temporary session token returned from login when TOTP is required',
    example: 'secret-ref:totp-session-token',
  })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  code: string;
}

/**
 * Recovery Code Verify Request DTO
 */
export class RecoveryCodeVerifyDto {
  @ApiProperty({
    description: 'Temporary session token from login',
    example: 'secret-ref:totp-session-token',
  })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({
    description: 'Recovery code in format XXXX-XXXX-XXXX',
    example: 'ABCD-1234-WXYZ',
    pattern: '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$',
  })
  @IsNotEmpty()
  @IsString()
  recoveryCode: string;
}

/**
 * Refresh Token Request DTO
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token (optional if using HTTP-only cookie)',
    example: 'secret-ref:refresh-token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

/**
 * Change Password Request DTO
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'secret-ref:current-password',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'secret-ref:new-password',
    minLength: 12,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'secret-ref:new-password',
  })
  @IsNotEmpty()
  @IsString()
  newPasswordConfirm: string;
}

/**
 * Update User Profile DTO
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Display name shown in UI',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Phone number with country code',
    example: '+81-90-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for UI',
    example: 'ja',
    enum: SUPPORTED_UI_LOCALES,
  })
  @IsOptional()
  @IsString()
  preferredLanguage?: SupportedUiLocale;

  @ApiPropertyOptional({
    description: 'URL to user avatar image',
    example: 'https://example.com/avatars/user123.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

/**
 * TOTP Enable Request DTO
 */
export class TotpEnableDto {
  @ApiProperty({
    description: '6-digit TOTP code from authenticator app to verify setup',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  code: string;
}

/**
 * TOTP Disable Request DTO
 */
export class TotpDisableDto {
  @ApiProperty({
    description: 'Current password for security confirmation',
    example: 'secret-ref:user-password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'TOTP code or recovery code for additional verification',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  code?: string;
}

/**
 * Regenerate Recovery Codes DTO
 */
export class RegenerateRecoveryCodesDto {
  @ApiProperty({
    description: 'Current password for security confirmation',
    example: 'secret-ref:user-password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}

/**
 * Force Reset Password DTO
 * Used when login returns passwordResetRequired
 */
export class ForceResetPasswordDto {
  @ApiProperty({
    description: 'Session token returned from login when password reset is required',
    example: 'secret-ref:password-reset-session-token',
  })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({
    description:
      'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'secret-ref:new-password',
    minLength: 12,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'secret-ref:new-password',
  })
  @IsNotEmpty()
  @IsString()
  newPasswordConfirm: string;
}

// =============================================================================
// Response DTOs for Auth Endpoints
// =============================================================================

/**
 * Login Success Response DTO
 */
export class LoginSuccessResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'secret-ref:access-token',
  })
  accessToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds', example: 900 })
  expiresIn: number;

  @ApiPropertyOptional({
    description: 'Tenant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  tenantId?: string;
}

/**
 * Login TOTP Required Response DTO
 */
export class LoginTotpRequiredResponseDto {
  @ApiProperty({ description: 'Indicates TOTP verification is required', example: true })
  totpRequired: boolean;

  @ApiProperty({
    description: 'Session token for TOTP verification',
    example: 'secret-ref:totp-session-token',
  })
  sessionToken: string;
}

/**
 * Login Password Reset Required Response DTO
 */
export class LoginPasswordResetRequiredResponseDto {
  @ApiProperty({ description: 'Indicates password reset is required', example: true })
  passwordResetRequired: boolean;

  @ApiProperty({ description: 'Reason for password reset', example: 'password_expired' })
  reason: string;

  @ApiProperty({
    description: 'Session token for password reset',
    example: 'secret-ref:password-reset-session-token',
  })
  sessionToken: string;
}

/**
 * User Info Response DTO
 */
export class UserInfoResponseDto {
  @ApiProperty({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Username', example: 'admin' })
  username: string;

  @ApiProperty({ description: 'Email address', example: 'admin@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'System Administrator' })
  displayName?: string;

  @ApiProperty({ description: 'Whether TOTP is enabled', example: false })
  totpEnabled: boolean;

  @ApiProperty({ description: 'User roles', type: [String], example: ['admin', 'user'] })
  roles: string[];

  @ApiPropertyOptional({ description: 'Tenant information' })
  tenant?: {
    id: string;
    code: string;
    name: string;
  };
}

/**
 * TOTP Setup Response DTO
 */
export class TotpSetupResponseDto {
  @ApiProperty({ description: 'TOTP secret key', example: 'secret-ref:totp-secret' })
  secret: string;

  @ApiProperty({
    description: 'QR code data URL for authenticator app',
    example: 'data:image/png;base64,iVBOR...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'OTP Auth URI',
    example: 'otpauth://totp/TCRN%20TMS:admin?secret=secret-ref:totp-secret&issuer=TCRN%20TMS',
  })
  otpAuthUrl: string;
}

/**
 * Recovery Codes Response DTO
 */
export class RecoveryCodesResponseDto {
  @ApiProperty({
    description: 'List of recovery codes (store securely)',
    type: [String],
    example: ['ABCD-1234-WXYZ', 'EFGH-5678-UVWX'],
  })
  recoveryCodes: string[];

  @ApiProperty({ description: 'Number of remaining unused codes', example: 10 })
  remainingCount: number;
}
