// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, LogSeverity, TechEventType } from '@tcrn/shared';
import { firstValueFrom } from 'rxjs';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import {
    CaptchaMode,
    PublicMessagesQueryDto,
    SubmitMessageDto,
} from '../dto/marshmallow.dto';


import { CaptchaContext, CaptchaService } from './captcha.service';
import { MarshmallowRateLimitService } from './marshmallow-rate-limit.service';
import { MarshmallowReactionService } from './marshmallow-reaction.service';
import { ProfanityFilterService } from './profanity-filter.service';
import { TrustScoreService } from './trust-score.service';


@Injectable()
export class PublicMarshmallowService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly profanityFilter: ProfanityFilterService,
    private readonly rateLimitService: MarshmallowRateLimitService,
    private readonly captchaService: CaptchaService,
    private readonly reactionService: MarshmallowReactionService,
    private readonly techEventLog: TechEventLogService,
    private readonly trustScoreService: TrustScoreService,
    private readonly httpService: HttpService,
  ) {}

  private readonly logger = new Logger(PublicMarshmallowService.name);

  /**
   * Find talent and config by path (multi-tenant)
   * Searches by homepage_path first, then by code
   */
  private async findTalentAndConfigByPath(path: string) {
    const prisma = this.databaseService.getPrisma();

    // Get all active tenants to search across schemas
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    for (const t of tenants) {
      const schema = t.schemaName;
      // Search by homepage_path or code (for streamer mode fallback)
      const talents = await prisma.$queryRawUnsafe<Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
      }>>(`
        SELECT id, display_name as "displayName", avatar_url as "avatarUrl"
        FROM "${schema}".talent
        WHERE (LOWER(homepage_path) = LOWER($1) OR LOWER(code) = LOWER($1)) AND is_active = true
      `, path);

      if (talents.length > 0) {
        const talent = talents[0];

        // Get config from the same tenant schema
        const configs = await prisma.$queryRawUnsafe<Array<{
          id: string;
          isEnabled: boolean;
          title: string;
          welcomeText: string;
          placeholderText: string;
          thankYouText: string;
          allowAnonymous: boolean;
          captchaMode: string;
          moderationEnabled: boolean;
          autoApprove: boolean;
          profanityFilterEnabled: boolean;
          externalBlocklistEnabled: boolean;
          maxMessageLength: number;
          minMessageLength: number;
          rateLimitPerIp: number;
          rateLimitWindowHours: number;
          reactionsEnabled: boolean;
          allowedReactions: string[];
          theme: Record<string, unknown>;
        }>>(`
          SELECT id, is_enabled as "isEnabled", title, welcome_text as "welcomeText",
                 placeholder_text as "placeholderText", thank_you_text as "thankYouText",
                 allow_anonymous as "allowAnonymous", captcha_mode as "captchaMode",
                 moderation_enabled as "moderationEnabled", auto_approve as "autoApprove",
                 profanity_filter_enabled as "profanityFilterEnabled",
                 external_blocklist_enabled as "externalBlocklistEnabled",
                 max_message_length as "maxMessageLength", min_message_length as "minMessageLength",
                 rate_limit_per_ip as "rateLimitPerIp", rate_limit_window_hours as "rateLimitWindowHours",
                 reactions_enabled as "reactionsEnabled", allowed_reactions as "allowedReactions", theme
          FROM "${schema}".marshmallow_config
          WHERE talent_id = $1::uuid
        `, talent.id);

        const config = configs[0];
        if (config) {
          return { talent, config, tenantSchema: schema };
        }
      }
    }

    return null;
  }

  /**
   * Submit message
   */
  async submitMessage(
    path: string,
    dto: SubmitMessageDto,
    context: { ip: string; userAgent: string },
  ): Promise<{ id: string; status: string; message: string }> {
    const prisma = this.databaseService.getPrisma();

    // 1. Get config by path (multi-tenant)
    const result = await this.findTalentAndConfigByPath(path);

    if (!result) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Page not found',
      });
    }

    const { talent, config, tenantSchema } = result;

    if (!config || !config.isEnabled) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow is not enabled',
      });
    }

    // 2. Validate message length
    if (dto.content.length < config.minMessageLength) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Message must be at least ${config.minMessageLength} characters`,
      });
    }

    if (dto.content.length > config.maxMessageLength) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Message must be at most ${config.maxMessageLength} characters`,
      });
    }

    // 3. Validate anonymous setting
    if (!config.allowAnonymous && dto.isAnonymous) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Anonymous messages are not allowed',
      });
    }

    if (!dto.isAnonymous && !dto.senderName) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Sender name is required for non-anonymous messages',
      });
    }

    // 4. Check rate limit
    const rateLimitResult = await this.rateLimitService.checkRateLimit(
      config.id,
      context.ip,
      dto.fingerprint,
      {
        rateLimitPerIp: config.rateLimitPerIp,
        rateLimitWindowHours: config.rateLimitWindowHours,
      },
    );

    if (!rateLimitResult.allowed) {
      throw new ForbiddenException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: '提交过于频繁，请稍后再试',
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    // 5. Check CAPTCHA
    const captchaContext: CaptchaContext = {
      ip: context.ip,
      fingerprint: dto.fingerprint,
      userAgent: context.userAgent,
      honeypotValue: dto.honeypot,  // Pass honeypot value for bot detection
    };

    const captchaDecision = await this.captchaService.shouldRequireCaptcha(
      config.captchaMode as CaptchaMode,
      captchaContext,
    );

    // If honeypot triggered or blocked trust level, reject immediately
    if (captchaDecision.forceReject) {
      await this.techEventLog.log({
        eventType: TechEventType.SECURITY_EVENT,
        scope: 'security',
        severity: LogSeverity.WARN,
        payload: {
          type: 'marshmallow_bot_detected',
          reason: captchaDecision.reason,
          ip: context.ip,
          fingerprint: dto.fingerprint,
        },
      });

      throw new ForbiddenException({
        code: 'REQUEST_BLOCKED',
        message: '请求已被拒绝',
      });
    }

    if (captchaDecision.required) {
      if (!dto.turnstileToken) {
        throw new ForbiddenException({
          code: 'CAPTCHA_REQUIRED',
          message: '请完成人机验证',
        });
      }

      const verified = await this.captchaService.verifyTurnstile(
        dto.turnstileToken,
        context.ip,
        dto.fingerprint,  // Pass fingerprint for trust score recording
      );

      if (!verified) {
        throw new ForbiddenException({
          code: 'CAPTCHA_INVALID',
          message: '人机验证失败，请重试',
        });
      }
    }

    // 6. Profanity filter
    const filterResult = await this.profanityFilter.filter(dto.content, talent.id, {
      profanityFilterEnabled: config.profanityFilterEnabled,
      externalBlocklistEnabled: config.externalBlocklistEnabled,
    });

    if (filterResult.action === 'reject') {
      // Record content rejection in trust score
      await this.trustScoreService.recordContentResult(dto.fingerprint, context.ip, 'rejected');

      // Log rejected message
      await this.techEventLog.log({
        eventType: TechEventType.SYSTEM_ERROR,
        scope: 'security',
        severity: LogSeverity.WARN,
        payload: {
          type: 'marshmallow_content_rejected',
          talentId: talent.id,
          flags: filterResult.flags,
          score: filterResult.score,
          ip: context.ip,
        },
      });

      throw new BadRequestException({
        code: 'CONTENT_REJECTED',
        message: '您的消息包含不允许的内容，请修改后重试',
      });
    }

    // Record content result in trust score
    if (filterResult.action === 'flag') {
      await this.trustScoreService.recordContentResult(dto.fingerprint, context.ip, 'flagged');
    } else {
      await this.trustScoreService.recordContentResult(dto.fingerprint, context.ip, 'clean');
    }

    // 7. Determine initial status
    let status: string;
    if (!config.moderationEnabled) {
      status = 'approved';
    } else if (config.autoApprove && filterResult.action === 'allow') {
      status = 'approved';
    } else {
      status = 'pending';
    }

    // 8. Handle Image (Bilibili Link)
    let imageUrl: string | null = null;
    let imageUrls: string[] = [];
    let socialLink: string | null = dto.socialLink || null;

    if (dto.selectedImageUrls && dto.selectedImageUrls.length > 0) {
        // User explicitly selected images
        imageUrls = dto.selectedImageUrls;
        imageUrl = imageUrls[0]; // Backward compatibility
    } else if (dto.socialLink) {
        // Legacy behavior: resolve single image if not provided
        try {
            const images = await this.resolveBilibiliImages(dto.socialLink);
            if (images.length > 0) {
                imageUrls = images;
                imageUrl = images[0];
            }
        } catch (error) {
             this.logger.warn(`Failed to resolve Bilibili image: ${error}`);
        }
    }

    // 9. Create message (using raw SQL for multi-tenant)
    const messages = await prisma.$queryRawUnsafe<Array<{ id: string; status: string }>>(`
      INSERT INTO "${tenantSchema}".marshmallow_message (
        id, config_id, talent_id, content, sender_name, is_anonymous, status,
        ip_address, user_agent, fingerprint_hash, profanity_flags, image_url, image_urls, social_link, created_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6,
        $7::inet, $8, $9, $10::varchar(64)[], $11, $12::text[], $13, now()
      )
      RETURNING id, status
    `,
      config.id,
      talent.id,
      filterResult.filteredContent ?? dto.content,
      dto.isAnonymous ? null : dto.senderName,
      dto.isAnonymous,
      status,
      context.ip,
      context.userAgent,
      dto.fingerprint,
      filterResult.flags || [],
      imageUrl,
      imageUrls,
      socialLink
    );

    const message = messages[0];

    return {
      id: message.id,
      status: message.status,
      message: config.thankYouText ?? '感谢你的提问！',
    };
  }

  /**
   * Get public messages (multi-tenant aware)
   */
  async getMessages(path: string, query: PublicMessagesQueryDto) {
    const prisma = this.databaseService.getPrisma();

    // Get talent and config by path (multi-tenant)
    const result = await this.findTalentAndConfigByPath(path);

    if (!result) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Page not found',
      });
    }

    const { config, tenantSchema } = result;

    if (!config.isEnabled) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow is not enabled',
      });
    }

    const { cursor, limit = 20, fingerprint } = query;

    // Build query with optional cursor
    let cursorCondition = '';
    const params: unknown[] = [config.id, limit + 1];

    if (cursor) {
      cursorCondition = 'AND created_at < $3::timestamptz';
      params.push(cursor);
    }

    const messages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      senderName: string | null;
      isAnonymous: boolean;
      isRead: boolean;
      replyContent: string | null;
      repliedAt: Date | null;
      repliedById: string | null;
      repliedByName: string | null;
      repliedByAvatar: string | null;
      repliedByEmail: string | null;
      reactionCounts: Record<string, number> | null;
      isPinned: boolean;
      createdAt: Date;
      imageUrl: string | null;
      imageUrls: string[] | null;
    }>>(`
      SELECT m.id, m.content, m.sender_name as "senderName", m.is_anonymous as "isAnonymous",
             m.is_read as "isRead", m.reply_content as "replyContent", m.replied_at as "repliedAt",
             m.replied_by as "repliedById", u.display_name as "repliedByName",
             u.avatar_url as "repliedByAvatar", u.email as "repliedByEmail",
             m.reaction_counts as "reactionCounts", m.is_pinned as "isPinned", m.created_at as "createdAt",
             m.image_url as "imageUrl", m.image_urls as "imageUrls"
      FROM "${tenantSchema}".marshmallow_message m
      LEFT JOIN "${tenantSchema}".system_user u ON m.replied_by = u.id
      WHERE m.config_id = $1::uuid AND m.status = 'approved' ${cursorCondition}
      ORDER BY m.is_pinned DESC, m.created_at DESC
      LIMIT $2
    `, ...params);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    // Get user reactions if fingerprint provided
    let userReactions: Record<string, string[]> = {};
    if (fingerprint && items.length > 0) {
      userReactions = await this.reactionService.getUserReactions(
        items.map((m) => m.id),
        fingerprint,
        tenantSchema,
      );
    }

    return {
      messages: items.map((m) => ({
        id: m.id,
        content: m.content,
        senderName: m.senderName,
        isAnonymous: m.isAnonymous,
        isRead: m.isRead ?? false,
        replyContent: m.replyContent,
        repliedAt: m.repliedAt?.toISOString() ?? null,
        repliedBy: m.repliedById ? { 
          id: m.repliedById, 
          displayName: m.repliedByName || 'Unknown',
          avatarUrl: m.repliedByAvatar,
          email: m.repliedByEmail,
        } : null,
        reactionCounts: m.reactionCounts ?? {},
        userReactions: userReactions[m.id] ?? [],
        createdAt: m.createdAt.toISOString(),
        imageUrl: m.imageUrl,
        imageUrls: m.imageUrls,
      })),
      cursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
      hasMore,
    };
  }

  /**
   * Get config for public page (multi-tenant aware)
   */
  async getConfig(path: string) {
    const prisma = this.databaseService.getPrisma();

    // Get all active tenants to search across schemas
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    let talent: { id: string; displayName: string; avatarUrl: string | null } | null = null;
    let tenantSchema: string | null = null;

    // Search for talent across all tenant schemas
    for (const t of tenants) {
      const schema = t.schemaName;
      // Search by homepage_path or code (for streamer mode fallback)
      const talents = await prisma.$queryRawUnsafe<Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
      }>>(`
        SELECT id, display_name as "displayName", avatar_url as "avatarUrl"
        FROM "${schema}".talent
        WHERE (LOWER(homepage_path) = LOWER($1) OR LOWER(code) = LOWER($1)) AND is_active = true
      `, path);

      if (talents.length > 0) {
        talent = talents[0];
        tenantSchema = schema;
        break;
      }
    }

    if (!talent || !tenantSchema) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Page not found',
      });
    }

    // Get config from the same tenant schema
    const configs = await prisma.$queryRawUnsafe<Array<{
      isEnabled: boolean;
      title: string;
      welcomeText: string;
      placeholderText: string;
      allowAnonymous: boolean;
      maxMessageLength: number;
      minMessageLength: number;
      reactionsEnabled: boolean;
      allowedReactions: string[];
      theme: Record<string, unknown>;
      avatarUrl: string | null;
      termsContentEn: string | null;
      termsContentZh: string | null;
      termsContentJa: string | null;
      privacyContentEn: string | null;
      privacyContentZh: string | null;
      privacyContentJa: string | null;
    }>>(`
      SELECT is_enabled as "isEnabled", title, welcome_text as "welcomeText",
             placeholder_text as "placeholderText", allow_anonymous as "allowAnonymous",
             max_message_length as "maxMessageLength", min_message_length as "minMessageLength",
             reactions_enabled as "reactionsEnabled", allowed_reactions as "allowedReactions", theme,
             avatar_url as "avatarUrl",
             terms_content_en as "termsContentEn", terms_content_zh as "termsContentZh", terms_content_ja as "termsContentJa",
             privacy_content_en as "privacyContentEn", privacy_content_zh as "privacyContentZh", privacy_content_ja as "privacyContentJa"
      FROM "${tenantSchema}".marshmallow_config
      WHERE talent_id = $1::uuid
    `, talent.id);

    const config = configs[0];

    if (!config || !config.isEnabled) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow is not enabled',
      });
    }

    return {
      talent: {
        displayName: talent.displayName,
        avatarUrl: config.avatarUrl || talent.avatarUrl, // Prefer config avatar, fallback to talent avatar
      },
      title: config.title,
      welcomeText: config.welcomeText,
      placeholderText: config.placeholderText,
      allowAnonymous: config.allowAnonymous,
      maxMessageLength: config.maxMessageLength,
      minMessageLength: config.minMessageLength,
      reactionsEnabled: config.reactionsEnabled,
      allowedReactions: config.allowedReactions,
      theme: config.theme,
      terms: {
        en: config.termsContentEn,
        zh: config.termsContentZh,
        ja: config.termsContentJa,
      },
      privacy: {
        en: config.privacyContentEn,
        zh: config.privacyContentZh,
        ja: config.privacyContentJa,
      },
    };
  }

  /**
   * Mark message as read (for streamers during broadcasts)
   * Public endpoint with fingerprint validation for basic security
   */
  async markAsRead(
    path: string,
    messageId: string,
    context: { fingerprint: string; ip: string },
  ): Promise<{ success: boolean; isRead: boolean }> {
    const prisma = this.databaseService.getPrisma();

    // Get talent and config by path (multi-tenant)
    const result = await this.findTalentAndConfigByPath(path);

    if (!result) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Page not found',
      });
    }

    const { config, tenantSchema } = result;

    if (!config.isEnabled) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow is not enabled',
      });
    }

    // Verify message exists and belongs to this config
    const messages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      isRead: boolean;
      status: string;
    }>>(`
      SELECT id, is_read as "isRead", status
      FROM "${tenantSchema}".marshmallow_message
      WHERE id = $1::uuid AND config_id = $2::uuid
    `, messageId, config.id);

    if (messages.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    const message = messages[0];

    // Only allow marking approved messages as read
    if (message.status !== 'approved') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Only approved messages can be marked as read',
      });
    }

    // Toggle read status
    const newIsRead = !message.isRead;

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET is_read = $1
      WHERE id = $2::uuid
    `, newIsRead, messageId);

    // Log the action
    await this.techEventLog.log({
      eventType: TechEventType.SYSTEM_ERROR,
      scope: 'integration',
      severity: LogSeverity.INFO,
      payload: {
        type: 'marshmallow_mark_read',
        messageId,
        isRead: newIsRead,
        fingerprint: context.fingerprint,
        ip: context.ip,
      },
    });

    return {
      success: true,
      isRead: newIsRead,
    };
  }

  /**
   * Mark message as read with SSO authentication
   * Only allows the talent owner to mark messages
   */
  async markAsReadAuth(
    path: string,
    messageId: string,
    context: {
      userId: string;
      displayName: string;
      talentId: string;
      tenantSchema: string;
      ip: string;
    },
  ): Promise<{ success: boolean; isRead: boolean }> {
    const prisma = this.databaseService.getPrisma();

    // Verify the message belongs to the talent in the SSO token
    // Support both homepage_path and code for path matching
    const messages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      isRead: boolean;
      status: string;
      talentId: string;
    }>>(`
      SELECT m.id, m.is_read as "isRead", m.status, m.talent_id as "talentId"
      FROM "${context.tenantSchema}".marshmallow_message m
      JOIN "${context.tenantSchema}".marshmallow_config c ON m.config_id = c.id
      JOIN "${context.tenantSchema}".talent t ON c.talent_id = t.id
      WHERE m.id = $1::uuid AND (LOWER(t.homepage_path) = LOWER($2) OR LOWER(t.code) = LOWER($2))
    `, messageId, path);

    if (messages.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    const message = messages[0];

    // Verify the SSO token is for this talent
    if (message.talentId !== context.talentId) {
      throw new ForbiddenException({
        code: 'UNAUTHORIZED',
        message: 'You are not authorized to manage this page',
      });
    }

    // Only allow marking approved messages
    if (message.status !== 'approved') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Only approved messages can be marked as read',
      });
    }

    // Toggle read status
    const newIsRead = !message.isRead;

    await prisma.$executeRawUnsafe(`
      UPDATE "${context.tenantSchema}".marshmallow_message
      SET is_read = $1
      WHERE id = $2::uuid
    `, newIsRead, messageId);

    return {
      success: true,
      isRead: newIsRead,
    };
  }

  /**
   * Reply to message with SSO authentication
   * Only allows the talent owner to reply
   */
  async replyAuth(
    path: string,
    messageId: string,
    content: string,
    context: {
      userId: string;
      displayName: string;
      talentId: string;
      tenantSchema: string;
      ip: string;
    },
  ): Promise<{ success: boolean; replyContent: string; repliedAt: string; repliedBy: { id: string; displayName: string } }> {
    const prisma = this.databaseService.getPrisma();

    // Verify the message belongs to the talent in the SSO token
    // Support both homepage_path and code for path matching
    const messages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      talentId: string;
      replyContent: string | null;
    }>>(`
      SELECT m.id, m.status, m.talent_id as "talentId", m.reply_content as "replyContent"
      FROM "${context.tenantSchema}".marshmallow_message m
      JOIN "${context.tenantSchema}".marshmallow_config c ON m.config_id = c.id
      JOIN "${context.tenantSchema}".talent t ON c.talent_id = t.id
      WHERE m.id = $1::uuid AND (LOWER(t.homepage_path) = LOWER($2) OR LOWER(t.code) = LOWER($2))
    `, messageId, path);

    if (messages.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    const message = messages[0];

    // Verify the SSO token is for this talent
    if (message.talentId !== context.talentId) {
      throw new ForbiddenException({
        code: 'UNAUTHORIZED',
        message: 'You are not authorized to manage this page',
      });
    }

    // Only allow replying to approved messages
    if (message.status !== 'approved') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only reply to approved messages',
      });
    }

    // Update message with reply - append if existing reply exists
    const now = new Date();
    const formattedTime = now.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    let newReplyContent = content;
    
    // If there's an existing reply, append the new content with a separator and author info
    if (message.replyContent) {
      newReplyContent = `${message.replyContent}\n\n---\n\n**${context.displayName}** (${formattedTime}):\n${content}`;
    }
    
    await prisma.$executeRawUnsafe(`
      UPDATE "${context.tenantSchema}".marshmallow_message
      SET reply_content = $1, replied_at = $2, replied_by = $3::uuid, is_read = true
      WHERE id = $4::uuid
    `, newReplyContent, now, context.userId, messageId);

    return {
      success: true,
      replyContent: newReplyContent,
      repliedAt: now.toISOString(),
      repliedBy: {
        id: context.userId,
        displayName: context.displayName,
      },
    };
  }

  /**
   * Resolve Bilibili Opus/Dynamic images
   * Supports:
   * - https://www.bilibili.com/opus/<ID>
   * - https://t.bilibili.com/<ID>
   */
  async resolveBilibiliImages(url: string | undefined): Promise<string[]> {
    if (!url) return [];

    // 1. Extract Dynamic ID
    let dynamicId: string | null = null;
    
    // Match opus/<ID> or t.bilibili.com/<ID>
    const match = url.match(/(?:opus\/|t\.bilibili\.com\/)(\d+)/);
    if (match) {
        dynamicId = match[1];
    }

    if (!dynamicId) return [];

    // 2. Fetch Dynamic Details from Bilibili API
    // API: https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=<ID>
    try {
        const { data } = await firstValueFrom(
            this.httpService.get(`https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${dynamicId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            })
        );

        if (data?.code === 0 && data?.data?.item) {
             const item = data.data.item;
             const images = this.extractImagesFromModules(item.modules);
             if (images.length > 0) return images;
        }
        
        // If API fails or no image found, try scraping the page (Fallback)
        this.logger.warn(`Bilibili API failed for ${dynamicId} (Code: ${data?.code}), trying fallback scraping...`);
        return this.resolveBilibiliImagesFromPage(dynamicId);

    } catch (error) {
        this.logger.warn(`Error fetching Bilibili API for ${dynamicId}: ${error}, trying fallback scraping...`);
        return this.resolveBilibiliImagesFromPage(dynamicId);
    }
  }

  /**
   * extracting images from API modules structure
   */
  private extractImagesFromModules(modules: any): string[] {
      const images: string[] = [];
      if (!modules) return [];
      
      if (Array.isArray(modules)) {
          for (const mod of modules) {
               const major = mod.module_dynamic?.major;
               if (major) {
                    // Opus
                    if (major.opus?.pics) {
                        for (const pic of major.opus.pics) {
                            if (pic.url) images.push(this.normalizeBilibiliUrl(pic.url));
                        }
                    }
                    // Draw
                    if (major.draw?.items) {
                        for (const d of major.draw.items) {
                            if (d.src) images.push(this.normalizeBilibiliUrl(d.src));
                        }
                    }
                    // Article
                    if (major.article?.covers) {
                        for (const cover of major.article.covers) {
                            images.push(this.normalizeBilibiliUrl(cover));
                        }
                    }
                    // Archive (Video cover)
                    if (major.archive?.cover) {
                        images.push(this.normalizeBilibiliUrl(major.archive.cover));
                    }
               }
               // Also check module_content (Strategy 1) for simple layout
               if (mod.module_content?.pics) {
                   for (const pic of mod.module_content.pics) {
                       if (pic.url) images.push(this.normalizeBilibiliUrl(pic.url));
                   }
               }
          }
      }
      return images;
  }

  /**
   * Fallback: Scrape Opus page for __INITIAL_STATE__
   */
  private async resolveBilibiliImagesFromPage(dynamicId: string): Promise<string[]> {
      try {
          // Use native fetch to match the behavior of the successful debug script
          const response = await fetch(`https://www.bilibili.com/opus/${dynamicId}`, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
          });
          
          if (!response.ok) {
              this.logger.warn(`Bilibili fallback fetch failed: ${response.status}`);
              return [];
          }

          const html = await response.text();
          this.logger.log(`Bilibili fallback HTML length: ${html.length}`);
          
          // Regex to extract __INITIAL_STATE__
          const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
          if (!stateMatch) {
              this.logger.warn('Bilibili fallback: __INITIAL_STATE__ not found in HTML');
              return [];
          }
          
          this.logger.log('Bilibili fallback: __INITIAL_STATE__ found');
          const state = JSON.parse(stateMatch[1]);
          const modules = state.detail?.modules;
          
          const images = this.extractImagesFromModules(modules);
          if (images.length > 0) return images;
          
          // Strategy 3: Regex match on the entire state string (Fallthrough)
          // This is useful if the structure is nested differently than expected
          const stateStr = JSON.stringify(state);
          const regexMatches = stateStr.matchAll(/https?:\/\/(i[0-9]|bfs)\.hdslb\.com\/bfs\/new_dyn\/[a-zA-Z0-9]+\.(png|jpg|jpeg|webp)/g);
          const regexImages: string[] = [];
          for (const match of regexMatches) {
               regexImages.push(this.normalizeBilibiliUrl(match[0]));
          }
          
          if (regexImages.length > 0) {
               this.logger.log(`Bilibili fallback: Regex found ${regexImages.length} images`);
               // Deduplicate
               return Array.from(new Set(regexImages));
          }

          this.logger.warn('Bilibili fallback: No images found in modules or regex');
          return [];
      } catch (error) {
          this.logger.error(`Error scraping Bilibili page ${dynamicId}: ${error}`);
          return [];
      }
  }

  private normalizeBilibiliUrl(url: string): string {
      if (!url) return '';
      if (url.startsWith('http://')) {
          return url.replace('http://', 'https://');
      }
      return url;
  }
}
