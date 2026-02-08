// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Auth Module Zod DTOs - Using createZodDto for Swagger integration
//
// This file demonstrates the migration pattern from class-validator to Zod with Swagger support.
// createZodDto() automatically generates:
//   - TypeScript types
//   - Runtime validation
//   - Swagger/OpenAPI documentation

import {
    ChangePasswordSchema,
    ForceResetPasswordSchema,
    LoginSchema,
    RecoveryCodeVerifySchema,
    RefreshTokenSchema,
    RegenerateRecoveryCodesSchema,
    TotpDisableSchema,
    TotpEnableSchema,
    TotpVerifySchema,
    UpdateUserProfileSchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// ============================================================================
// Auth Request DTOs (using Zod schemas)
// ============================================================================

/**
 * Login Request DTO
 * @example { tenantCode: 'UAT_Corp', login: 'admin@example.com', password: 'SecureP@ss123' }
 */
export class LoginZodDto extends createZodDto(LoginSchema) {}

/**
 * TOTP Verify Request DTO
 * @example { sessionToken: 'sess_abc123', code: '123456' }
 */
export class TotpVerifyZodDto extends createZodDto(TotpVerifySchema) {}

/**
 * Recovery Code Verify Request DTO
 * @example { sessionToken: 'sess_abc123', recoveryCode: 'ABCD-1234-WXYZ' }
 */
export class RecoveryCodeVerifyZodDto extends createZodDto(RecoveryCodeVerifySchema) {}

/**
 * Refresh Token Request DTO
 * @example { refreshToken: 'rt_xxx...' }
 */
export class RefreshTokenZodDto extends createZodDto(RefreshTokenSchema) {}

/**
 * Change Password Request DTO
 * @example { currentPassword: 'old', newPassword: 'NewSecure123!', newPasswordConfirm: 'NewSecure123!' }
 */
export class ChangePasswordZodDto extends createZodDto(ChangePasswordSchema) {}

/**
 * Force Reset Password Request DTO (when login returns passwordResetRequired)
 * @example { sessionToken: 'sess_abc123', newPassword: 'NewSecure123!', newPasswordConfirm: 'NewSecure123!' }
 */
export class ForceResetPasswordZodDto extends createZodDto(ForceResetPasswordSchema) {}

/**
 * Update User Profile Request DTO
 * @example { displayName: 'John Doe', preferredLanguage: 'ja' }
 */
export class UpdateUserProfileZodDto extends createZodDto(UpdateUserProfileSchema) {}

/**
 * TOTP Enable Request DTO
 * @example { code: '123456' }
 */
export class TotpEnableZodDto extends createZodDto(TotpEnableSchema) {}

/**
 * TOTP Disable Request DTO
 * @example { password: 'SecureP@ss123' }
 */
export class TotpDisableZodDto extends createZodDto(TotpDisableSchema) {}

/**
 * Regenerate Recovery Codes Request DTO
 * @example { password: 'SecureP@ss123' }
 */
export class RegenerateRecoveryCodesZodDto extends createZodDto(RegenerateRecoveryCodesSchema) {}
