// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  ConfigurationEntityRecord,
  MembershipTreeClass,
  SystemDictionaryItemRecord,
} from '@/lib/api/modules/configuration';

export interface DialogPlatformOption {
  id: string;
  code: string;
  displayName: string;
}

export interface DialogConsumerOption {
  id: string;
  code: string;
  nameEn: string;
}

export interface DialogMembershipLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  color?: string;
  typeId: string;
}

export interface DialogMembershipType {
  id: string;
  code: string;
  name: string;
  classId: string;
  levels: DialogMembershipLevel[];
}

export interface DialogMembershipClass {
  id: string;
  code: string;
  name: string;
  types: DialogMembershipType[];
}

export const DEFAULT_PLATFORM_OPTIONS: DialogPlatformOption[] = [
  { id: '1', code: 'YOUTUBE', displayName: 'YouTube' },
  { id: '2', code: 'TWITCH', displayName: 'Twitch' },
  { id: '3', code: 'TWITTER', displayName: 'Twitter/X' },
  { id: '4', code: 'BILIBILI', displayName: 'Bilibili' },
  { id: '5', code: 'TIKTOK', displayName: 'TikTok' },
];

export function buildDefaultConsumerOptions(labels: {
  legacyCrm: string;
  discordBot: string;
  billingSystem: string;
}): DialogConsumerOption[] {
  return [
    { id: '1', code: 'LEGACY_CRM', nameEn: labels.legacyCrm },
    { id: '2', code: 'DISCORD_BOT', nameEn: labels.discordBot },
    { id: '3', code: 'BILLING', nameEn: labels.billingSystem },
  ];
}

export function buildDefaultMembershipClasses(labels: {
  subscription: string;
  channelMembership: string;
  tier1: string;
  tier2: string;
  tier3: string;
}): DialogMembershipClass[] {
  return [
    {
      id: '1',
      code: 'SUBSCRIPTION',
      name: labels.subscription,
      types: [
        {
          id: '1',
          code: 'CHANNEL_MEMBERSHIP',
          name: labels.channelMembership,
          classId: '1',
          levels: [
            { id: '1', code: 'TIER1', name: labels.tier1, rank: 1, color: '#10b981', typeId: '1' },
            { id: '2', code: 'TIER2', name: labels.tier2, rank: 2, color: '#3b82f6', typeId: '1' },
            { id: '3', code: 'TIER3', name: labels.tier3, rank: 3, color: '#8b5cf6', typeId: '1' },
          ],
        },
      ],
    },
  ];
}

const getExtraDisplayName = (extraData: Record<string, unknown> | null): string | null => {
  const displayName = extraData?.displayName;
  return typeof displayName === 'string' && displayName.trim().length > 0 ? displayName : null;
};

export const mapPlatformOptions = (
  items: SystemDictionaryItemRecord[],
): DialogPlatformOption[] =>
  items.map((item) => ({
    id: item.id,
    code: item.code,
    displayName: getExtraDisplayName(item.extraData) ?? item.name ?? item.nameEn ?? item.code,
  }));

export const mapConsumerOptions = (
  items: ConfigurationEntityRecord[],
): DialogConsumerOption[] =>
  items.map((item) => ({
    id: item.id,
    code: item.code,
    nameEn: item.nameEn || item.name || item.code,
  }));

export const mapMembershipTree = (
  items: MembershipTreeClass[],
): DialogMembershipClass[] =>
  items.map((membershipClass) => ({
    id: membershipClass.id,
    code: membershipClass.code,
    name: membershipClass.name || membershipClass.nameEn || membershipClass.code,
    types: membershipClass.types.map((membershipType) => ({
      id: membershipType.id,
      code: membershipType.code,
      name: membershipType.name || membershipType.nameEn || membershipType.code,
      classId: membershipType.classId,
      levels: membershipType.levels.map((level) => ({
        id: level.id,
        code: level.code,
        name: level.name || level.nameEn || level.code,
        rank: level.rank,
        color: level.color ?? undefined,
        typeId: level.typeId,
      })),
    })),
  }));
