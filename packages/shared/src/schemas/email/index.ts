// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Email Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const EmailProviderSchema = z.enum(['tencent_ses', 'smtp']);
export const EmailTemplateCategorySchema = z.enum(['system', 'business']);
export const EmailLocaleSchema = z.enum(['en', 'zh', 'ja']);

export type EmailProvider = z.infer<typeof EmailProviderSchema>;

// ============================================================================
// Config Schemas
// ============================================================================
export const TencentSesConfigSchema = z.object({
  secretId: z.string().min(1, 'Secret ID is required'),
  secretKey: z.string().min(1, 'Secret Key is required'),
  region: z.string().optional(),
  fromAddress: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
});

export const SmtpConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  fromAddress: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'From name is required'),
});

export const SaveEmailConfigSchema = z.object({
  provider: EmailProviderSchema,
  tencentSes: TencentSesConfigSchema.optional(),
  smtp: SmtpConfigSchema.optional(),
}).refine(
  (data) => {
    if (data.provider === 'tencent_ses') return !!data.tencentSes;
    if (data.provider === 'smtp') return !!data.smtp;
    return true;
  },
  { message: 'Configuration must match selected provider' }
);

export const TestEmailSchema = z.object({
  testEmail: z.string().email('Invalid email address'),
});

export type SaveEmailConfigInput = z.infer<typeof SaveEmailConfigSchema>;
export type TestEmailInput = z.infer<typeof TestEmailSchema>;

// ============================================================================
// Template Schemas
// ============================================================================
export const CreateEmailTemplateSchema = z.object({
  code: z.string().min(1).max(64),
  nameEn: z.string().max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  subjectEn: z.string().max(255),
  subjectZh: z.string().max(255).optional(),
  subjectJa: z.string().max(255).optional(),
  bodyHtmlEn: z.string(),
  bodyHtmlZh: z.string().optional(),
  bodyHtmlJa: z.string().optional(),
  bodyTextEn: z.string().optional(),
  bodyTextZh: z.string().optional(),
  bodyTextJa: z.string().optional(),
  variables: z.array(z.string()).optional(),
  category: EmailTemplateCategorySchema,
});

export const UpdateEmailTemplateSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  subjectEn: z.string().max(255).optional(),
  subjectZh: z.string().max(255).optional(),
  subjectJa: z.string().max(255).optional(),
  bodyHtmlEn: z.string().optional(),
  bodyHtmlZh: z.string().optional(),
  bodyHtmlJa: z.string().optional(),
  bodyTextEn: z.string().optional(),
  bodyTextZh: z.string().optional(),
  bodyTextJa: z.string().optional(),
  variables: z.array(z.string()).optional(),
  category: EmailTemplateCategorySchema.optional(),
  isActive: z.boolean().optional(),
});

export const PreviewEmailTemplateSchema = z.object({
  locale: EmailLocaleSchema.optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const EmailTemplateQuerySchema = z.object({
  category: EmailTemplateCategorySchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateEmailTemplateInput = z.infer<typeof CreateEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof UpdateEmailTemplateSchema>;

// ============================================================================
// Send Email Schema
// ============================================================================
export const SendEmailSchema = z.object({
  tenantSchema: z.string().min(1, 'Tenant schema is required'),
  templateCode: z.string().min(1, 'Template code is required'),
  recipientPiiId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  locale: EmailLocaleSchema.optional(),
  variables: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) => data.recipientPiiId || data.recipientEmail,
  { message: 'Either recipientPiiId or recipientEmail is required' }
);

export type SendEmailInput = z.infer<typeof SendEmailSchema>;
