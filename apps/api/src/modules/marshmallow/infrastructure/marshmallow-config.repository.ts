// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  MarshmallowConfigFieldChange,
  MarshmallowConfigRecord,
  MarshmallowConfigStatsRow,
  MarshmallowTalentRecord,
} from '../domain/marshmallow-config.policy';

@Injectable()
export class MarshmallowConfigRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findConfigByTalentId(
    tenantSchema: string,
    talentId: string,
  ): Promise<MarshmallowConfigRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const configs = await prisma.$queryRawUnsafe<MarshmallowConfigRecord[]>(
      `
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
      `,
      talentId,
    );

    return configs[0] ?? null;
  }

  async findActiveTalent(
    tenantSchema: string,
    talentId: string,
  ): Promise<MarshmallowTalentRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<MarshmallowTalentRecord[]>(
      `
        SELECT id, code, homepage_path as "homepagePath", settings
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
          AND is_active = true
      `,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findTenantCodeBySchema(tenantSchema: string): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.tenant.findMany({
      where: {
        schemaName: tenantSchema,
      },
      select: {
        code: true,
      },
      take: 1,
    });

    return tenants[0]?.code ?? null;
  }

  async insertDefaultConfig(params: {
    tenantSchema: string;
    talentId: string;
    defaultConfig: {
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
    };
  }): Promise<MarshmallowConfigRecord> {
    const { defaultConfig, talentId, tenantSchema } = params;
    const prisma = this.databaseService.getPrisma();
    const configs = await prisma.$queryRawUnsafe<MarshmallowConfigRecord[]>(
      `
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
          gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18::text[], $19::jsonb,
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
      defaultConfig.isEnabled,
      defaultConfig.title,
      defaultConfig.welcomeText,
      defaultConfig.placeholderText,
      defaultConfig.thankYouText,
      defaultConfig.allowAnonymous,
      defaultConfig.captchaMode,
      defaultConfig.moderationEnabled,
      defaultConfig.autoApprove,
      defaultConfig.profanityFilterEnabled,
      defaultConfig.externalBlocklistEnabled,
      defaultConfig.maxMessageLength,
      defaultConfig.minMessageLength,
      defaultConfig.rateLimitPerIp,
      defaultConfig.rateLimitWindowHours,
      defaultConfig.reactionsEnabled,
      defaultConfig.allowedReactions,
      JSON.stringify(defaultConfig.theme),
    );

    return configs[0];
  }

  async findStatsByConfigId(
    tenantSchema: string,
    configId: string,
  ): Promise<MarshmallowConfigStatsRow | null> {
    const prisma = this.databaseService.getPrisma();
    const stats = await prisma.$queryRawUnsafe<MarshmallowConfigStatsRow[]>(
      `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE is_read = false) as unread
        FROM "${tenantSchema}".marshmallow_message
        WHERE config_id = $1::uuid
      `,
      configId,
    );

    return stats[0] ?? null;
  }

  async findTalentHomepagePath(
    tenantSchema: string,
    talentId: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<Array<{ homepagePath: string | null }>>(
      `
        SELECT homepage_path as "homepagePath"
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );

    return talents[0]?.homepagePath ?? null;
  }

  async findTalentRouteRecord(
    tenantSchema: string,
    talentId: string,
  ): Promise<Pick<MarshmallowTalentRecord, 'code' | 'homepagePath'> | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<Array<Pick<MarshmallowTalentRecord, 'code' | 'homepagePath'>>>(
      `
        SELECT code, homepage_path as "homepagePath"
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );

    return talents[0] ?? null;
  }

  async updateConfigFields(
    tenantSchema: string,
    configId: string,
    changes: MarshmallowConfigFieldChange[],
  ): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    const prisma = this.databaseService.getPrisma();
    const setClauses: string[] = [];
    const params: unknown[] = [configId];
    let paramIndex = 2;

    for (const change of changes) {
      const column = this.toSnakeCase(change.field);
      if (change.field === 'allowedReactions') {
        setClauses.push(`${column} = $${paramIndex}::text[]`);
        params.push(change.value);
      } else if (change.field === 'theme') {
        setClauses.push(`${column} = $${paramIndex}::jsonb`);
        params.push(JSON.stringify(change.value));
      } else {
        setClauses.push(`${column} = $${paramIndex}`);
        params.push(change.value);
      }
      paramIndex++;
    }

    setClauses.push('version = version + 1');
    setClauses.push('updated_at = now()');

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".marshmallow_config
        SET ${setClauses.join(', ')}
        WHERE id = $1::uuid
      `,
      ...params,
    );
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
