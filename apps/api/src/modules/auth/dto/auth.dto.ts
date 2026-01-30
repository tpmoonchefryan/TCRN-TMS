// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

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
    example: 'SecureP@ssw0rd123',
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
 * TOTP Verify Request DTO
 */
export class TotpVerifyDto {
  @ApiProperty({ 
    description: 'Temporary session token returned from login when TOTP is required',
    example: 'sess_abc123def456...',
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
    example: 'sess_abc123def456...',
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
    example: 'rt_dGVuYW50X3RlbXBsYXRl.a1b2c3d4e5f6...',
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
    example: 'OldP@ssw0rd123',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewSecureP@ss123',
    minLength: 12,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirm new password (must match newPassword)',
    example: 'NewSecureP@ss123',
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
    enum: ['en', 'zh', 'ja'],
  })
  @IsOptional()
  @IsString()
  preferredLanguage?: 'en' | 'zh' | 'ja';

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
    example: 'SecureP@ssw0rd123',
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
    example: 'SecureP@ssw0rd123',
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
    example: 'sess_abc123def456...',
  })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({ 
    description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewSecureP@ss123',
    minLength: 12,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirm new password (must match newPassword)',
    example: 'NewSecureP@ss123',
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
  @ApiProperty({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds', example: 900 })
  expiresIn: number;

  @ApiPropertyOptional({ description: 'Tenant ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  tenantId?: string;
}

/**
 * Login TOTP Required Response DTO
 */
export class LoginTotpRequiredResponseDto {
  @ApiProperty({ description: 'Indicates TOTP verification is required', example: true })
  totpRequired: boolean;

  @ApiProperty({ description: 'Session token for TOTP verification', example: 'sess_abc123def456...' })
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

  @ApiProperty({ description: 'Session token for password reset', example: 'sess_abc123def456...' })
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
  @ApiProperty({ description: 'TOTP secret key', example: 'JBSWY3DPEHPK3PXP' })
  secret: string;

  @ApiProperty({ description: 'QR code data URL for authenticator app', example: 'data:image/png;base64,iVBOR...' })
  qrCode: string;

  @ApiProperty({ description: 'OTP Auth URI', example: 'otpauth://totp/TCRN%20TMS:admin?secret=JBSWY3DPEHPK3PXP&issuer=TCRN%20TMS' })
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

