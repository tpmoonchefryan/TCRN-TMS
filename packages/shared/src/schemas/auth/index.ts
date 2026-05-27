// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Auth Module Zod Schemas - Validation rules for authentication endpoints
import { z } from 'zod';

import { SUPPORTED_UI_LOCALES } from '../../constants/locale';

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
// SSO Foundation Schemas
// ============================================================================
export const SsoProviderTypeSchema = z.enum(['oidc']);
export const SsoOwnerScopeSchema = z.enum([
  'tenant_product',
  'ac_platform',
  'external_tool_readiness',
]);

export const SsoProviderDiscoverySchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  displayName: z.record(z.string(), z.string()),
  providerType: SsoProviderTypeSchema,
  ownerScope: SsoOwnerScopeSchema,
  enabled: z.boolean(),
});

export type SsoProviderDiscovery = z.infer<typeof SsoProviderDiscoverySchema>;

export const StartSsoLoginSchema = z.object({
  tenantCode: z.string().min(1, 'Tenant code is required'),
  providerCode: z.string().min(1, 'SSO provider code is required'),
  next: z.string().optional(),
});

export type StartSsoLoginInput = z.infer<typeof StartSsoLoginSchema>;

export const StartSsoLoginResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  stateExpiresIn: z.number().int().positive(),
  provider: SsoProviderDiscoverySchema,
});

export type StartSsoLoginResponse = z.infer<typeof StartSsoLoginResponseSchema>;

export const SsoExchangeSchema = z.object({
  result: z.string().min(16, 'SSO result code is required'),
});

export type SsoExchangeInput = z.infer<typeof SsoExchangeSchema>;

export const StartSsoAccountLinkSchema = z.object({
  providerCode: z.string().min(1, 'SSO provider code is required'),
  next: z.string().optional(),
});

export type StartSsoAccountLinkInput = z.infer<typeof StartSsoAccountLinkSchema>;

export const SsoAccountLinkCompleteSchema = z.object({
  result: z.string().min(16, 'SSO account-link result code is required'),
});

export type SsoAccountLinkCompleteInput = z.infer<typeof SsoAccountLinkCompleteSchema>;

export const SsoAccountLinkSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string().uuid(),
  providerCode: z.string().min(1),
  providerIssuer: z.string().min(1),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  linkedAt: z.string(),
  lastLoginAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

export type SsoAccountLink = z.infer<typeof SsoAccountLinkSchema>;

export const PlatformExternalToolSsoReadinessSchema = z.object({
  toolCode: z.string().min(1),
  status: z.enum(['blocked', 'ready', 'not_applicable']),
  requiredByPhase: z.string().nullable(),
  providerId: z.string().uuid().nullable(),
  failClosed: z.boolean(),
  evidence: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

export type PlatformExternalToolSsoReadiness = z.infer<
  typeof PlatformExternalToolSsoReadinessSchema
>;

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
  code: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
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
  preferredLanguage: z.enum(SUPPORTED_UI_LOCALES).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;

// ============================================================================
// TOTP Enable Schema
// ============================================================================
export const TotpEnableSchema = z.object({
  code: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
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
