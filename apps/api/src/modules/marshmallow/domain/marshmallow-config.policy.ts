// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { buildSharedMarshmallowUrl } from '@tcrn/shared';

import { CaptchaMode, type UpdateConfigDto } from '../dto/marshmallow.dto';

export const DEFAULT_MARSHMALLOW_CONFIG = {
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
  allowedReactions: [] as string[],
  theme: {} as Record<string, unknown>,
};

export interface MarshmallowConfigRecord {
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

export interface MarshmallowConfigStatsRow {
  total: bigint;
  pending: bigint;
  approved: bigint;
  rejected: bigint;
  unread: bigint;
}

export interface MarshmallowConfigStats {
  totalMessages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  unreadCount: number;
}

export interface MarshmallowTalentRecord {
  id: string;
  code: string;
  homepagePath: string | null;
  settings: Record<string, unknown> | null;
}

export interface MarshmallowConfigFieldChange {
  field: string;
  value: unknown;
}

export const isMarshmallowEnabledByTalentSettings = (
  settings: Record<string, unknown> | null | undefined,
): boolean => settings?.marshmallowEnabled !== false;

export const buildDefaultMarshmallowConfig = (isEnabled: boolean) => ({
  ...DEFAULT_MARSHMALLOW_CONFIG,
  isEnabled,
});

export const buildMarshmallowConfigStats = (
  stats: MarshmallowConfigStatsRow | null | undefined,
): MarshmallowConfigStats => {
  const row = stats ?? {
    total: 0n,
    pending: 0n,
    approved: 0n,
    rejected: 0n,
    unread: 0n,
  };

  return {
    totalMessages: Number(row.total),
    pendingCount: Number(row.pending),
    approvedCount: Number(row.approved),
    rejectedCount: Number(row.rejected),
    unreadCount: Number(row.unread),
  };
};

export const buildMarshmallowConfigResponse = (params: {
  config: MarshmallowConfigRecord;
  stats: MarshmallowConfigStats;
  appUrl: string;
  tenantCode: string;
  talentCode: string;
}) => {
  const { appUrl, config, stats, talentCode, tenantCode } = params;

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
    marshmallowUrl: buildSharedMarshmallowUrl(appUrl, tenantCode, talentCode),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
    version: config.version,
  };
};

export const buildMarshmallowConfigChanges = (
  config: MarshmallowConfigRecord,
  dto: UpdateConfigDto,
): {
  changedFields: MarshmallowConfigFieldChange[];
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
} => {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const changedFields: MarshmallowConfigFieldChange[] = [];

  const fields = [
    'isEnabled',
    'title',
    'welcomeText',
    'placeholderText',
    'thankYouText',
    'allowAnonymous',
    'captchaMode',
    'moderationEnabled',
    'autoApprove',
    'profanityFilterEnabled',
    'externalBlocklistEnabled',
    'maxMessageLength',
    'minMessageLength',
    'rateLimitPerIp',
    'rateLimitWindowHours',
    'reactionsEnabled',
    'allowedReactions',
    'theme',
    'avatarUrl',
    'termsContentEn',
    'termsContentZh',
    'termsContentJa',
    'privacyContentEn',
    'privacyContentZh',
    'privacyContentJa',
  ] as const;

  for (const field of fields) {
    const value = dto[field];
    if (value === undefined) {
      continue;
    }

    oldValue[field] = config[field];
    newValue[field] = value;
    changedFields.push({ field, value });
  }

  return {
    changedFields,
    oldValue,
    newValue,
  };
};
