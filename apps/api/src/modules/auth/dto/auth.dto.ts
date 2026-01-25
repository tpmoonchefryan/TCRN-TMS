// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Login Request DTO
 */
export class LoginDto {
  @ApiProperty({ description: 'Tenant code' })
  @IsNotEmpty()
  @IsString()
  tenantCode: string;

  @ApiProperty({ description: 'Username or email' })
  @IsNotEmpty()
  @IsString()
  login: string;

  @ApiProperty({ description: 'Password' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Remember me flag for extended session' })
  @IsOptional()
  rememberMe?: boolean;
}

/**
 * TOTP Verify Request DTO
 */
export class TotpVerifyDto {
  @ApiProperty({ description: 'Temporary session token from login' })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({ description: '6-digit TOTP code' })
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
  @ApiProperty({ description: 'Temporary session token from login' })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({ description: 'Recovery code (format: XXXX-XXXX-XXXX)' })
  @IsNotEmpty()
  @IsString()
  recoveryCode: string;
}

/**
 * Refresh Token Request DTO
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh token (optional if using cookie)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

/**
 * Change Password Request DTO
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsNotEmpty()
  @IsString()
  newPasswordConfirm: string;
}

/**
 * Update User Profile DTO
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Preferred language (en, zh, ja)' })
  @IsOptional()
  @IsString()
  preferredLanguage?: 'en' | 'zh' | 'ja';

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

/**
 * TOTP Enable Request DTO
 */
export class TotpEnableDto {
  @ApiProperty({ description: '6-digit TOTP code from authenticator app' })
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
  @ApiProperty({ description: 'Current password for confirmation' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'TOTP code or recovery code' })
  @IsOptional()
  @IsString()
  code?: string;
}

/**
 * Regenerate Recovery Codes DTO
 */
export class RegenerateRecoveryCodesDto {
  @ApiProperty({ description: 'Current password for confirmation' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

/**
 * Force Reset Password DTO
 * Used when login returns passwordResetRequired
 */
export class ForceResetPasswordDto {
  @ApiProperty({ description: 'Session token from login response' })
  @IsNotEmpty()
  @IsString()
  sessionToken: string;

  @ApiProperty({ description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsNotEmpty()
  @IsString()
  newPasswordConfirm: string;
}
