// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Auth Module Zod Schemas - Validation rules for authentication endpoints

import { z } from 'zod';

// ============================================================================
// Password Validation
// ============================================================================
const passwordSchema = z.string().min(12, 'Password must be at least 12 characters');

// ============================================================================
// Login Schema
// ============================================================================
export const LoginSchema = z.object({
  tenantCode: z.string().min(1, 'Tenant code is required'),
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================================
// Forgot Password Schema
// ============================================================================
export const ForgotPasswordSchema = z.object({
  tenantCode: z.string().min(1, 'Tenant code is required'),
  email: z.string().email('Valid email is required'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// ============================================================================
// TOTP Verify Schema
// ============================================================================
export const TotpVerifySchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export type TotpVerifyInput = z.infer<typeof TotpVerifySchema>;

// ============================================================================
// Recovery Code Verify Schema
// ============================================================================
export const RecoveryCodeVerifySchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
  recoveryCode: z.string().min(1, 'Recovery code is required'),
});

export type RecoveryCodeVerifyInput = z.infer<typeof RecoveryCodeVerifySchema>;

// ============================================================================
// Refresh Token Schema
// ============================================================================
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// ============================================================================
// Change Password Schema
// ============================================================================
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ============================================================================
// Force Reset Password Schema
// ============================================================================
export const ForceResetPasswordSchema = z
  .object({
    sessionToken: z.string().min(1, 'Session token is required'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

export type ForceResetPasswordInput = z.infer<typeof ForceResetPasswordSchema>;

// ============================================================================
// Reset Password By Token Schema (Email reset)
// ============================================================================
export const ResetPasswordByTokenSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    tenantCode: z.string().min(1, 'Tenant code is required'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

export type ResetPasswordByTokenInput = z.infer<typeof ResetPasswordByTokenSchema>;

// ============================================================================
// Update User Profile Schema
// ============================================================================
export const UpdateUserProfileSchema = z.object({
  displayName: z.string().optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'zh', 'ja']).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;

// ============================================================================
// TOTP Enable Schema
// ============================================================================
export const TotpEnableSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export type TotpEnableInput = z.infer<typeof TotpEnableSchema>;

// ============================================================================
// TOTP Disable Schema
// ============================================================================
export const TotpDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().optional(),
});

export type TotpDisableInput = z.infer<typeof TotpDisableSchema>;

// ============================================================================
// Regenerate Recovery Codes Schema
// ============================================================================
export const RegenerateRecoveryCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type RegenerateRecoveryCodesInput = z.infer<typeof RegenerateRecoveryCodesSchema>;
