// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

// =============================================================================
// Enums
// =============================================================================

export enum CaptchaMode {
  ALWAYS = 'always',
  NEVER = 'never',
  AUTO = 'auto',
}

export enum MessageStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

export enum RejectionReason {
  PROFANITY = 'profanity',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  OFF_TOPIC = 'off_topic',
  DUPLICATE = 'duplicate',
  EXTERNAL_LINK = 'external_link',
  MANUAL = 'manual',
  OTHER = 'other',
}

// =============================================================================
// Config DTOs
// =============================================================================

export class UpdateConfigDto {
  @ApiPropertyOptional({ description: 'Whether the marshmallow page is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Page title', example: 'Aki Mailbox', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional({ description: 'Welcome text shown above the form', example: 'Leave your message here', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  welcomeText?: string;

  @ApiPropertyOptional({ description: 'Input placeholder text', example: 'Write your message...', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholderText?: string;

  @ApiPropertyOptional({ description: 'Thank-you text shown after submission', example: 'Thanks for your message!', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thankYouText?: string;

  @ApiPropertyOptional({ description: 'Whether anonymous submissions are allowed', example: true })
  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Captcha mode', enum: CaptchaMode, example: CaptchaMode.AUTO })
  @IsOptional()
  @IsEnum(CaptchaMode)
  captchaMode?: CaptchaMode;

  @ApiPropertyOptional({ description: 'Whether manual moderation is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  moderationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Whether messages can be auto-approved', example: false })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({ description: 'Whether profanity filtering is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  profanityFilterEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Whether the external blocklist is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  externalBlocklistEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Maximum message length', example: 500, minimum: 1, maximum: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  maxMessageLength?: number;

  @ApiPropertyOptional({ description: 'Minimum message length', example: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minMessageLength?: number;

  @ApiPropertyOptional({ description: 'Rate limit per IP within the configured window', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  rateLimitPerIp?: number;

  @ApiPropertyOptional({ description: 'Rate-limit window in hours', example: 1, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  rateLimitWindowHours?: number;

  @ApiPropertyOptional({ description: 'Whether reactions are enabled on public messages', example: true })
  @IsOptional()
  @IsBoolean()
  reactionsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Allowed public reactions', type: [String], example: ['heart', 'star'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedReactions?: string[];

  @ApiPropertyOptional({
    description: 'Theme overrides for the public marshmallow page',
    type: 'object',
    additionalProperties: true,
    example: { accentColor: '#ff6b6b' },
  })
  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  // Custom avatar for marshmallow page
  @ApiPropertyOptional({ description: 'Public avatar URL', example: 'https://cdn.example.com/avatar.png', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;

  // Terms content (multi-language)
  @ApiPropertyOptional({ description: 'Terms content in English', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentEn?: string;

  @ApiPropertyOptional({ description: 'Terms content in Chinese', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentZh?: string;

  @ApiPropertyOptional({ description: 'Terms content in Japanese', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentJa?: string;

  // Privacy content (multi-language)
  @ApiPropertyOptional({ description: 'Privacy content in English', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentEn?: string;

  @ApiPropertyOptional({ description: 'Privacy content in Chinese', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentZh?: string;

  @ApiPropertyOptional({ description: 'Privacy content in Japanese', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentJa?: string;

  @ApiProperty({ description: 'Optimistic lock version', example: 2, minimum: 1 })
  @IsInt()
  version!: number;
}

// =============================================================================
// Message DTOs
// =============================================================================

export class MessageListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by message status', enum: MessageStatus, example: MessageStatus.PENDING })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @ApiPropertyOptional({ description: 'Filter starred messages only', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional({ description: 'Filter read state', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter messages that already have replies', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasReply?: boolean;

  @ApiPropertyOptional({ description: 'Created-at lower bound', example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Created-at upper bound', example: '2026-04-13T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Keyword search', example: 'birthday', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['createdAt', 'isStarred', 'isPinned'], example: 'createdAt', default: 'createdAt' })
  @IsOptional()
  @IsEnum(['createdAt', 'isStarred', 'isPinned'])
  sortBy?: 'createdAt' | 'isStarred' | 'isPinned' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], example: 'desc', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class RejectMessageDto {
  @ApiProperty({ description: 'Rejection reason', enum: RejectionReason, example: RejectionReason.SPAM })
  @IsEnum(RejectionReason)
  reason!: RejectionReason;

  @ApiPropertyOptional({ description: 'Optional moderator note', example: 'Contains repeated external links', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class ReplyMessageDto {
  @ApiProperty({ description: 'Reply content', example: 'Thank you for your message!', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class BatchActionDto {
  @ApiProperty({
    description: 'Target message identifiers',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440020'],
  })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];

  @ApiProperty({
    description: 'Batch action to execute',
    enum: ['approve', 'reject', 'markRead', 'markUnread', 'star', 'unstar', 'delete'],
    example: 'approve',
  })
  @IsEnum(['approve', 'reject', 'markRead', 'markUnread', 'star', 'unstar', 'delete'])
  action!: 'approve' | 'reject' | 'markRead' | 'markUnread' | 'star' | 'unstar' | 'delete';

  @ApiPropertyOptional({ description: 'Rejection reason when action=reject', enum: RejectionReason, example: RejectionReason.SPAM })
  @IsOptional()
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;
}

export class UpdateMessageDto {
  @ApiPropertyOptional({ description: 'Mark as read/unread', example: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Mark as starred/unstarred', example: false })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional({ description: 'Mark as pinned/unpinned', example: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

// =============================================================================
// Public Submit DTOs
// =============================================================================

export class SubmitMessageDto {
  @ApiProperty({ description: 'Public message content', example: 'Happy birthday!', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({ description: 'Optional sender display name', example: 'Aki Fan', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  senderName?: string;

  @ApiProperty({ description: 'Whether the message is anonymous', example: true })
  @IsBoolean()
  isAnonymous!: boolean;

  @ApiPropertyOptional({ description: 'Turnstile verification token', example: 'cf-turnstile-token' })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @ApiProperty({ description: 'Client fingerprint', example: 'fp_abc123', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  fingerprint!: string;

  @ApiPropertyOptional({ description: 'Hidden honeypot field that should remain empty', example: '', maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  honeypot?: string;  // Hidden field - should always be empty for real users

  @ApiPropertyOptional({ description: 'Optional social link attached to the message', example: 'https://x.com/example', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  socialLink?: string;

  @ApiPropertyOptional({ description: 'Selected image URLs to attach', type: [String], example: ['https://i.example.com/1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  selectedImageUrls?: string[];
}

export class PublicMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Pagination cursor', example: 'cursor_123' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size', example: 100, minimum: 1, maximum: 200, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Client fingerprint for personalized visibility', example: 'fp_abc123', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fingerprint?: string;

  @ApiPropertyOptional({ description: 'Cache-busting timestamp parameter', example: '1713000000000' })
  @IsOptional()
  @IsString()
  _t?: string; // Cache-busting timestamp parameter
}

export class ReactDto {
  @ApiProperty({ description: 'Reaction code', example: 'heart', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  reaction!: string;

  @ApiProperty({ description: 'Client fingerprint', example: 'fp_abc123', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  fingerprint!: string;
}

export class MarkReadDto {
  @ApiProperty({ description: 'Client fingerprint', example: 'fp_abc123', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  fingerprint!: string;
}

// =============================================================================
// SSO Authenticated DTOs (for streamer mode)
// =============================================================================

export class SsoMarkReadDto {
  @ApiProperty({ description: 'SSO token issued for streamer mode', example: 'eyJhbGciOi...' })
  @IsString()
  ssoToken!: string;
}

export class SsoReplyDto {
  @ApiProperty({ description: 'SSO token issued for streamer mode', example: 'eyJhbGciOi...' })
  @IsString()
  ssoToken!: string;

  @ApiProperty({ description: 'Reply content', example: 'Thanks for your support!', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

// =============================================================================
// Export DTOs
// =============================================================================

export class ExportMessagesDto {
  @ApiProperty({ description: 'Export format', enum: ['csv', 'json', 'xlsx'], example: 'xlsx' })
  @IsEnum(['csv', 'json', 'xlsx'])
  format!: 'csv' | 'json' | 'xlsx';

  @ApiPropertyOptional({ description: 'Filter by message statuses', enum: MessageStatus, isArray: true, example: [MessageStatus.APPROVED] })
  @IsOptional()
  @IsArray()
  @IsEnum(MessageStatus, { each: true })
  status?: MessageStatus[];

  @ApiPropertyOptional({ description: 'Created-at lower bound', example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Created-at upper bound', example: '2026-04-13T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Include rejected messages in export', example: false })
  @IsOptional()
  @IsBoolean()
  includeRejected?: boolean;
}
