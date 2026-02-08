// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow Module Zod Schemas - Validation for anonymous message box

import { z } from 'zod';

import { PaginationSchema } from '../common.schema';

// ============================================================================
// Enums
// ============================================================================
export const CaptchaModeSchema = z.enum(['always', 'never', 'auto']);
export const MessageStatusSchema = z.enum(['pending', 'approved', 'rejected', 'spam']);
export const RejectionReasonSchema = z.enum([
  'profanity', 'spam', 'harassment', 'off_topic', 
  'duplicate', 'external_link', 'manual', 'other'
]);
export const MarshmallowBatchActionSchema = z.enum([
  'approve', 'reject', 'markRead', 'markUnread', 'star', 'unstar', 'delete'
]);
export const ExportFormatSchema = z.enum(['csv', 'json', 'xlsx']);

// Blocklist enums
export const PatternTypeSchema = z.enum(['domain', 'url_regex', 'keyword']);
export const BlocklistSeveritySchema = z.enum(['low', 'medium', 'high']);
export const BlocklistActionSchema = z.enum(['reject', 'flag', 'replace']);
export const OwnerTypeSchema = z.enum(['tenant', 'subsidiary', 'talent']);

export type MarshmallowCaptchaMode = z.infer<typeof CaptchaModeSchema>;
export type MarshmallowMessageStatus = z.infer<typeof MessageStatusSchema>;
export type MarshmallowRejectionReason = z.infer<typeof RejectionReasonSchema>;
export type MarshmallowBatchAction = z.infer<typeof MarshmallowBatchActionSchema>;

// ============================================================================
// Config Schema
// ============================================================================
export const UpdateMarshmallowConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  title: z.string().max(128).optional(),
  welcomeText: z.string().max(2000).optional(),
  placeholderText: z.string().max(255).optional(),
  thankYouText: z.string().max(500).optional(),
  allowAnonymous: z.boolean().optional(),
  captchaMode: CaptchaModeSchema.optional(),
  moderationEnabled: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
  profanityFilterEnabled: z.boolean().optional(),
  externalBlocklistEnabled: z.boolean().optional(),
  maxMessageLength: z.coerce.number().int().min(1).max(2000).optional(),
  minMessageLength: z.coerce.number().int().min(1).max(100).optional(),
  rateLimitPerIp: z.coerce.number().int().min(1).max(100).optional(),
  rateLimitWindowHours: z.coerce.number().int().min(1).max(24).optional(),
  reactionsEnabled: z.boolean().optional(),
  allowedReactions: z.array(z.string()).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  avatarUrl: z.string().max(512).optional(),
  // Multi-language content
  termsContentEn: z.string().max(50000).optional(),
  termsContentZh: z.string().max(50000).optional(),
  termsContentJa: z.string().max(50000).optional(),
  privacyContentEn: z.string().max(50000).optional(),
  privacyContentZh: z.string().max(50000).optional(),
  privacyContentJa: z.string().max(50000).optional(),
  version: z.number().int(),
});

export type UpdateMarshmallowConfigInput = z.infer<typeof UpdateMarshmallowConfigSchema>;

// ============================================================================
// Message Query Schema
// ============================================================================
export const MessageListQuerySchema = PaginationSchema.extend({
  status: MessageStatusSchema.optional(),
  isStarred: z.coerce.boolean().optional(),
  isRead: z.coerce.boolean().optional(),
  hasReply: z.coerce.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  keyword: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'isStarred', 'isPinned']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type MessageListQueryInput = z.infer<typeof MessageListQuerySchema>;

// ============================================================================
// Message Action Schemas
// ============================================================================
export const RejectMessageSchema = z.object({
  reason: RejectionReasonSchema,
  note: z.string().max(255).optional(),
});

export const ReplyMessageSchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(2000),
});

export const MarshmallowBatchSchema = z.object({
  messageIds: z.array(z.string()).min(1, 'At least one message ID is required'),
  action: MarshmallowBatchActionSchema,
  rejectionReason: RejectionReasonSchema.optional(),
});

export const UpdateMessageSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export type RejectMessageInput = z.infer<typeof RejectMessageSchema>;
export type ReplyMessageInput = z.infer<typeof ReplyMessageSchema>;
export type MarshmallowBatchInput = z.infer<typeof MarshmallowBatchSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;

// ============================================================================
// Public Submit Schemas
// ============================================================================
export const SubmitMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000),
  senderName: z.string().max(64).optional(),
  isAnonymous: z.boolean(),
  turnstileToken: z.string().optional(),
  fingerprint: z.string().max(64),
  honeypot: z.string().max(256).optional(),
  socialLink: z.string().max(512).optional(),
  selectedImageUrls: z.array(z.string().max(512)).optional(),
});

export const PublicMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  fingerprint: z.string().max(64).optional(),
  _t: z.string().optional(),
});

export const ReactSchema = z.object({
  reaction: z.string().max(32),
  fingerprint: z.string().max(64),
});

export const MarkReadSchema = z.object({
  fingerprint: z.string().max(64),
});

export type SubmitMessageInput = z.infer<typeof SubmitMessageSchema>;
export type PublicMessagesQueryInput = z.infer<typeof PublicMessagesQuerySchema>;
export type ReactInput = z.infer<typeof ReactSchema>;
export type MarkReadInput = z.infer<typeof MarkReadSchema>;

// ============================================================================
// SSO Schemas
// ============================================================================
export const SsoMarkReadSchema = z.object({
  ssoToken: z.string().min(1, 'SSO token is required'),
});

export const SsoReplySchema = z.object({
  ssoToken: z.string().min(1, 'SSO token is required'),
  content: z.string().min(1, 'Reply content is required').max(2000),
});

export type SsoMarkReadInput = z.infer<typeof SsoMarkReadSchema>;
export type SsoReplyInput = z.infer<typeof SsoReplySchema>;

// ============================================================================
// Export Schema
// ============================================================================
export const ExportMessagesSchema = z.object({
  format: ExportFormatSchema,
  status: z.array(MessageStatusSchema).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeRejected: z.boolean().optional(),
});

export type ExportMessagesInput = z.infer<typeof ExportMessagesSchema>;

// ============================================================================
// External Blocklist Schemas
// ============================================================================
export const ExternalBlocklistQuerySchema = PaginationSchema.extend({
  scopeType: OwnerTypeSchema.optional().default('tenant'),
  scopeId: z.string().optional(),
  category: z.string().max(64).optional(),
  includeInherited: z.coerce.boolean().optional().default(true),
  includeDisabled: z.coerce.boolean().optional().default(false),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const DisableExternalBlocklistSchema = z.object({
  scopeType: OwnerTypeSchema,
  scopeId: z.string().optional(),
});

export const CreateExternalBlocklistSchema = z.object({
  ownerType: OwnerTypeSchema,
  ownerId: z.string().optional(),
  pattern: z.string().min(1, 'Pattern is required').max(512),
  patternType: PatternTypeSchema,
  nameEn: z.string().min(1, 'English name is required').max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(64).optional(),
  severity: BlocklistSeveritySchema.optional().default('medium'),
  action: BlocklistActionSchema.optional().default('reject'),
  replacement: z.string().max(255).optional(),
  inherit: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isForceUse: z.boolean().optional().default(false),
});

export const UpdateExternalBlocklistSchema = z.object({
  pattern: z.string().min(1).max(512).optional(),
  patternType: PatternTypeSchema.optional(),
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(64).optional(),
  severity: BlocklistSeveritySchema.optional(),
  action: BlocklistActionSchema.optional(),
  replacement: z.string().max(255).optional(),
  inherit: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isForceUse: z.boolean().optional(),
  version: z.number().int(),
});

export const BlocklistBatchToggleSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
  isActive: z.boolean(),
});

export type ExternalBlocklistQueryInput = z.infer<typeof ExternalBlocklistQuerySchema>;
export type DisableExternalBlocklistInput = z.infer<typeof DisableExternalBlocklistSchema>;
export type CreateExternalBlocklistInput = z.infer<typeof CreateExternalBlocklistSchema>;
export type UpdateExternalBlocklistInput = z.infer<typeof UpdateExternalBlocklistSchema>;
export type BlocklistBatchToggleInput = z.infer<typeof BlocklistBatchToggleSchema>;
