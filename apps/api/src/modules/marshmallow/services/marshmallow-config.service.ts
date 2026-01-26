// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes, type RequestContext, type ChangeAction } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { UpdateConfigDto, CaptchaMode } from '../dto/marshmallow.dto';

const DEFAULT_CONFIG = {
  isEnabled: false,
  title: null,
  welcomeText: null,
  placeholderText: '写下你想说的话...',
  thankYouText: '感谢你的提问！',
  allowAnonymous: true,
  captchaMode: CaptchaMode.AUTO,
  moderationEnabled: true,
  autoApprove: false,
  profanityFilterEnabled: true,
  externalBlocklistEnabled: true,
  maxMessageLength: 500,
  minMessageLength: 1,
  rateLimitPerIp: 5,
  rateLimitWindowHours: 1,
  reactionsEnabled: true,
  allowedReactions: [], // Empty array means all emojis are allowed
  theme: {},
};

// Database row type for marshmallow_config
interface MarshmallowConfigRow {
  id: string;
  talentId: string;
  isEnabled: boolean;
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  thankYouText: string | null;
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
  avatarUrl: string | null;
  termsContentEn: string | null;
  termsContentZh: string | null;
  termsContentJa: string | null;
  privacyContentEn: string | null;
  privacyContentZh: string | null;
  privacyContentJa: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

@Injectable()
export class MarshmallowConfigService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get or create config for talent (multi-tenant aware)
   */
  async getOrCreate(talentId: string, tenantSchema: string) {
    // Validate tenantSchema to prevent SQL injection and runtime errors
    if (!tenantSchema || typeof tenantSchema !== 'string') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant schema is required',
      });
    }

    const prisma = this.databaseService.getPrisma();

    // Query config using raw SQL with tenant schema
    const configs = await prisma.$queryRawUnsafe<MarshmallowConfigRow[]>(`
      SELECT 
        id, talent_id as "talentId", is_enabled as "isEnabled",
        title, welcome_text as "welcomeText", placeholder_text as "placeholderText",
        thank_you_text as "thankYouText", allow_anonymous as "allowAnonymous",
        captcha_mode as "captchaMode", moderation_enabled as "moderationEnabled",
        auto_approve as "autoApprove", profanity_filter_enabled as "profanityFilterEnabled",
        external_blocklist_enabled as "externalBlocklistEnabled",
        max_message_length as "maxMessageLength", min_message_length as "minMessageLength",
        rate_limit_per_ip as "rateLimitPerIp", rate_limit_window_hours as "rateLimitWindowHours",
        reactions_enabled as "reactionsEnabled", allowed_reactions as "allowedReactions",
        theme, avatar_url as "avatarUrl",
        terms_content_en as "termsContentEn", terms_content_zh as "termsContentZh", terms_content_ja as "termsContentJa",
        privacy_content_en as "privacyContentEn", privacy_content_zh as "privacyContentZh", privacy_content_ja as "privacyContentJa",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".marshmallow_config
      WHERE talent_id = $1::uuid
    `, talentId);

    let config = configs[0];

    if (!config) {
      // First verify talent exists in the tenant schema and get settings
      const talents = await prisma.$queryRawUnsafe<Array<{ 
        id: string; 
        homepagePath: string | null;
        settings: Record<string, unknown> | null;
      }>>(`
        SELECT id, homepage_path as "homepagePath", settings
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid AND is_active = true
      `, talentId);

      if (talents.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: `Talent with ID ${talentId} not found`,
        });
      }

      // Check talent settings for marshmallowEnabled (default to true if not set)
      const talentSettings = talents[0].settings || {};
      const marshmallowEnabled = talentSettings.marshmallowEnabled !== false; // Default to true

      // Create default config using raw SQL (gen_random_uuid() for id, now() for timestamps)
      const insertResult = await prisma.$queryRawUnsafe<MarshmallowConfigRow[]>(`
        INSERT INTO "${tenantSchema}".marshmallow_config (
          id, talent_id, is_enabled, title, welcome_text, placeholder_text, thank_you_text,
          allow_anonymous, captcha_mode, moderation_enabled, auto_approve,
          profanity_filter_enabled, external_blocklist_enabled, max_message_length,
          min_message_length, rate_limit_per_ip, rate_limit_window_hours,
          reactions_enabled, allowed_reactions, theme, avatar_url,
          terms_content_en, terms_content_zh, terms_content_ja,
          privacy_content_en, privacy_content_zh, privacy_content_ja,
          version, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::text[], $19::jsonb, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL,
          1, now(), now()
        )
        RETURNING 
          id, talent_id as "talentId", is_enabled as "isEnabled",
          title, welcome_text as "welcomeText", placeholder_text as "placeholderText",
          thank_you_text as "thankYouText", allow_anonymous as "allowAnonymous",
          captcha_mode as "captchaMode", moderation_enabled as "moderationEnabled",
          auto_approve as "autoApprove", profanity_filter_enabled as "profanityFilterEnabled",
          external_blocklist_enabled as "externalBlocklistEnabled",
          max_message_length as "maxMessageLength", min_message_length as "minMessageLength",
          rate_limit_per_ip as "rateLimitPerIp", rate_limit_window_hours as "rateLimitWindowHours",
          reactions_enabled as "reactionsEnabled", allowed_reactions as "allowedReactions",
          theme, avatar_url as "avatarUrl",
          terms_content_en as "termsContentEn", terms_content_zh as "termsContentZh", terms_content_ja as "termsContentJa",
          privacy_content_en as "privacyContentEn", privacy_content_zh as "privacyContentZh", privacy_content_ja as "privacyContentJa",
          created_at as "createdAt", updated_at as "updatedAt", version
      `,
        talentId,
        marshmallowEnabled, // Use talent settings instead of DEFAULT_CONFIG.isEnabled
        DEFAULT_CONFIG.title,
        DEFAULT_CONFIG.welcomeText,
        DEFAULT_CONFIG.placeholderText,
        DEFAULT_CONFIG.thankYouText,
        DEFAULT_CONFIG.allowAnonymous,
        DEFAULT_CONFIG.captchaMode,
        DEFAULT_CONFIG.moderationEnabled,
        DEFAULT_CONFIG.autoApprove,
        DEFAULT_CONFIG.profanityFilterEnabled,
        DEFAULT_CONFIG.externalBlocklistEnabled,
        DEFAULT_CONFIG.maxMessageLength,
        DEFAULT_CONFIG.minMessageLength,
        DEFAULT_CONFIG.rateLimitPerIp,
        DEFAULT_CONFIG.rateLimitWindowHours,
        DEFAULT_CONFIG.reactionsEnabled,
        DEFAULT_CONFIG.allowedReactions,
        JSON.stringify(DEFAULT_CONFIG.theme),
      );

      config = insertResult[0];
    }

    // Get stats
    const stats = await this.getStats(config.id, tenantSchema);

    // Get talent for URL
    const talents = await prisma.$queryRawUnsafe<Array<{ homepagePath: string | null }>>(`
      SELECT homepage_path as "homepagePath"
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    return {
      id: config.id,
      talentId: config.talentId,
      isEnabled: config.isEnabled,
      title: config.title,
      welcomeText: config.welcomeText,
      placeholderText: config.placeholderText,
      thankYouText: config.thankYouText,
      allowAnonymous: config.allowAnonymous,
      captchaMode: config.captchaMode,
      moderationEnabled: config.moderationEnabled,
      autoApprove: config.autoApprove,
      profanityFilterEnabled: config.profanityFilterEnabled,
      externalBlocklistEnabled: config.externalBlocklistEnabled,
      maxMessageLength: config.maxMessageLength,
      minMessageLength: config.minMessageLength,
      rateLimitPerIp: config.rateLimitPerIp,
      rateLimitWindowHours: config.rateLimitWindowHours,
      reactionsEnabled: config.reactionsEnabled,
      allowedReactions: config.allowedReactions,
      theme: config.theme,
      avatarUrl: config.avatarUrl,
      termsContentEn: config.termsContentEn,
      termsContentZh: config.termsContentZh,
      termsContentJa: config.termsContentJa,
      privacyContentEn: config.privacyContentEn,
      privacyContentZh: config.privacyContentZh,
      privacyContentJa: config.privacyContentJa,
      stats,
      marshmallowUrl: `${appUrl}/m/${talents[0]?.homepagePath}`,
      createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
      updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt,
      version: config.version,
    };
  }

  /**
   * Update config (multi-tenant aware)
   */
  async update(talentId: string, tenantSchema: string, dto: UpdateConfigDto, context: RequestContext) {
    // Validate tenantSchema
    if (!tenantSchema || typeof tenantSchema !== 'string') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant schema is required',
      });
    }

    const prisma = this.databaseService.getPrisma();

    // Get current config
    const configs = await prisma.$queryRawUnsafe<MarshmallowConfigRow[]>(`
      SELECT 
        id, talent_id as "talentId", is_enabled as "isEnabled",
        title, welcome_text as "welcomeText", placeholder_text as "placeholderText",
        thank_you_text as "thankYouText", allow_anonymous as "allowAnonymous",
        captcha_mode as "captchaMode", moderation_enabled as "moderationEnabled",
        auto_approve as "autoApprove", profanity_filter_enabled as "profanityFilterEnabled",
        external_blocklist_enabled as "externalBlocklistEnabled",
        max_message_length as "maxMessageLength", min_message_length as "minMessageLength",
        rate_limit_per_ip as "rateLimitPerIp", rate_limit_window_hours as "rateLimitWindowHours",
        reactions_enabled as "reactionsEnabled", allowed_reactions as "allowedReactions",
        theme, avatar_url as "avatarUrl",
        terms_content_en as "termsContentEn", terms_content_zh as "termsContentZh", terms_content_ja as "termsContentJa",
        privacy_content_en as "privacyContentEn", privacy_content_zh as "privacyContentZh", privacy_content_ja as "privacyContentJa",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".marshmallow_config
      WHERE talent_id = $1::uuid
    `, talentId);

    const config = configs[0];

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow config not found',
      });
    }

    if (config.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Config was modified by another user',
      });
    }

    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const setClauses: string[] = [];
    const params: unknown[] = [config.id];
    let paramIndex = 2;

    const fields = [
      'isEnabled', 'title', 'welcomeText', 'placeholderText', 'thankYouText',
      'allowAnonymous', 'captchaMode', 'moderationEnabled', 'autoApprove',
      'profanityFilterEnabled', 'externalBlocklistEnabled', 'maxMessageLength',
      'minMessageLength', 'rateLimitPerIp', 'rateLimitWindowHours',
      'reactionsEnabled', 'allowedReactions', 'theme', 'avatarUrl',
      'termsContentEn', 'termsContentZh', 'termsContentJa',
      'privacyContentEn', 'privacyContentZh', 'privacyContentJa',
    ];

    for (const field of fields) {
      if (dto[field as keyof UpdateConfigDto] !== undefined) {
        const dbField = this.toSnakeCase(field);
        const value = dto[field as keyof UpdateConfigDto];
        
        oldValue[field] = config[field as keyof typeof config];
        newValue[field] = value;

        if (field === 'allowedReactions') {
          setClauses.push(`${dbField} = $${paramIndex}::text[]`);
        } else if (field === 'theme') {
          setClauses.push(`${dbField} = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(value));
          paramIndex++;
          continue;
        } else {
          setClauses.push(`${dbField} = $${paramIndex}`);
        }
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length > 0) {
      setClauses.push('version = version + 1');
      setClauses.push('updated_at = now()');

      await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".marshmallow_config
        SET ${setClauses.join(', ')}
        WHERE id = $1::uuid
      `, ...params);

      // Log change using standard service
      await this.changeLogService.createDirect({
        action: 'update' as ChangeAction,
        objectType: 'marshmallow_config',
        objectId: config.id,
        objectName: 'Marshmallow config',
        oldValue,
        newValue,
      }, context);
    }

    return this.getOrCreate(talentId, tenantSchema);
  }

  /**
   * Get stats for config (multi-tenant aware)
   */
  private async getStats(configId: string, tenantSchema: string) {
    const prisma = this.databaseService.getPrisma();

    const stats = await prisma.$queryRawUnsafe<Array<{
      total: bigint;
      pending: bigint;
      approved: bigint;
      rejected: bigint;
      unread: bigint;
    }>>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE is_read = false) as unread
      FROM "${tenantSchema}".marshmallow_message
      WHERE config_id = $1::uuid
    `, configId);

    const s = stats[0] || { total: 0n, pending: 0n, approved: 0n, rejected: 0n, unread: 0n };

    return {
      totalMessages: Number(s.total),
      pendingCount: Number(s.pending),
      approvedCount: Number(s.approved),
      rejectedCount: Number(s.rejected),
      unreadCount: Number(s.unread),
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Set custom domain for marshmallow config
   */
  async setCustomDomain(
    talentId: string,
    customDomain: string | null,
    context: RequestContext,
  ): Promise<{ customDomain: string | null; token: string | null; txtRecord: string | null }> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema!;
    const crypto = await import('crypto');

    // First get or create config
    const config = await this.getOrCreate(talentId, tenantSchema);
    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow config not found',
      });
    }

    if (!customDomain) {
      // Remove custom domain
      await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".marshmallow_config
        SET custom_domain = NULL, 
            custom_domain_verified = false, 
            custom_domain_verification_token = NULL,
            updated_at = now()
        WHERE talent_id = $1::uuid
      `, talentId);
      return { customDomain: null, token: null, txtRecord: null };
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const txtRecord = `tcrn-verify=${token}`;

    // Update config with new domain and token
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".marshmallow_config
      SET custom_domain = $2, 
          custom_domain_verified = false, 
          custom_domain_verification_token = $3,
          updated_at = now()
      WHERE talent_id = $1::uuid
    `, talentId, customDomain.toLowerCase(), token);

    return { customDomain: customDomain.toLowerCase(), token, txtRecord };
  }

  /**
   * Verify custom domain by checking DNS TXT record
   */
  async verifyCustomDomain(
    talentId: string,
    context: RequestContext,
  ): Promise<{ verified: boolean; message: string }> {
    const { promises: dns } = await import('dns');
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema!;

    // Get config with domain info
    const configs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      customDomain: string | null;
      customDomainVerificationToken: string | null;
    }>>(`
      SELECT id, custom_domain as "customDomain", 
             custom_domain_verification_token as "customDomainVerificationToken"
      FROM "${tenantSchema}".marshmallow_config
      WHERE talent_id = $1::uuid
    `, talentId);

    const config = configs[0];
    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow config not found',
      });
    }

    if (!config.customDomain) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No custom domain set',
      });
    }

    if (!config.customDomainVerificationToken) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No verification token generated. Please set the custom domain first.',
      });
    }

    try {
      // Query TXT records for the domain
      const records = await dns.resolveTxt(config.customDomain);
      const flatRecords = records.flat();
      
      const expectedRecord = `tcrn-verify=${config.customDomainVerificationToken}`;
      const found = flatRecords.some(record => record === expectedRecord);

      if (found) {
        // Update verification status
        await prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}".marshmallow_config
          SET custom_domain_verified = true, updated_at = now()
          WHERE id = $1::uuid
        `, config.id);

        return { verified: true, message: 'Domain verified successfully' };
      } else {
        return { 
          verified: false, 
          message: `TXT record not found. Expected: ${expectedRecord}` 
        };
      }
    } catch {
      return { 
        verified: false, 
        message: 'DNS lookup failed. Please ensure the TXT record is properly configured.' 
      };
    }
  }
}
