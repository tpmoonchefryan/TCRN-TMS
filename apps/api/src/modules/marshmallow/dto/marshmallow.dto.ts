// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  welcomeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholderText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thankYouText?: string;

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @IsOptional()
  @IsEnum(CaptchaMode)
  captchaMode?: CaptchaMode;

  @IsOptional()
  @IsBoolean()
  moderationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @IsOptional()
  @IsBoolean()
  profanityFilterEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  externalBlocklistEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  maxMessageLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minMessageLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  rateLimitPerIp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  rateLimitWindowHours?: number;

  @IsOptional()
  @IsBoolean()
  reactionsEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedReactions?: string[];

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  // Custom avatar for marshmallow page
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;

  // Terms content (multi-language)
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  termsContentJa?: string;

  // Privacy content (multi-language)
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  privacyContentJa?: string;

  @IsInt()
  version!: number;
}

// =============================================================================
// Message DTOs
// =============================================================================

export class MessageListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasReply?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'isStarred', 'isPinned'])
  sortBy?: 'createdAt' | 'isStarred' | 'isPinned' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class RejectMessageDto {
  @IsEnum(RejectionReason)
  reason!: RejectionReason;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class ReplyMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class BatchActionDto {
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];

  @IsEnum(['approve', 'reject', 'markRead', 'markUnread', 'star', 'unstar', 'delete'])
  action!: 'approve' | 'reject' | 'markRead' | 'markUnread' | 'star' | 'unstar' | 'delete';

  @IsOptional()
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;
}

export class UpdateMessageDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

// =============================================================================
// Public Submit DTOs
// =============================================================================

export class SubmitMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  senderName?: string;

  @IsBoolean()
  isAnonymous!: boolean;

  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @IsString()
  @MaxLength(64)
  fingerprint!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  honeypot?: string;  // Hidden field - should always be empty for real users

  @IsOptional()
  @IsString()
  @MaxLength(512)
  socialLink?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  selectedImageUrls?: string[];
}

export class PublicMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 100;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fingerprint?: string;

  @IsOptional()
  @IsString()
  _t?: string; // Cache-busting timestamp parameter
}

export class ReactDto {
  @IsString()
  @MaxLength(32)
  reaction!: string;

  @IsString()
  @MaxLength(64)
  fingerprint!: string;
}

export class MarkReadDto {
  @IsString()
  @MaxLength(64)
  fingerprint!: string;
}

// =============================================================================
// SSO Authenticated DTOs (for streamer mode)
// =============================================================================

export class SsoMarkReadDto {
  @IsString()
  ssoToken!: string;
}

export class SsoReplyDto {
  @IsString()
  ssoToken!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

// =============================================================================
// Export DTOs
// =============================================================================

export class ExportMessagesDto {
  @IsEnum(['csv', 'json', 'xlsx'])
  format!: 'csv' | 'json' | 'xlsx';

  @IsOptional()
  @IsArray()
  @IsEnum(MessageStatus, { each: true })
  status?: MessageStatus[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  includeRejected?: boolean;
}
