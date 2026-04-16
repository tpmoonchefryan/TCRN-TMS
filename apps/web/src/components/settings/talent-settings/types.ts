// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  TalentExternalPageDomainConfig,
  TalentExternalPagesDomain,
  TalentLifecycleIssue,
  TalentLifecycleStatus,
  TalentProfileStoreSummary,
  TalentPublishReadiness,
} from '@/lib/api/modules/talent';

export type TalentSettingsTab =
  | 'details'
  | 'config'
  | 'dictionary'
  | 'security'
  | 'settings'
  | 'scope';

export type ExternalPageDomainConfig = TalentExternalPageDomainConfig;

export type ProfileStoreInfo = TalentProfileStoreSummary;
export type TalentReadiness = TalentPublishReadiness;
export type TalentReadinessIssue = TalentLifecycleIssue;

export interface TalentData {
  id: string;
  code: string;
  displayName: string;
  avatarUrl: string | null;
  path: string;
  subsidiaryId: string | null;
  profileStoreId: string | null;
  profileStore: TalentProfileStoreSummary | null;
  homepagePath: string;
  timezone: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  customerCount: number;
  version: number;
  settings: {
    inheritTimezone: boolean;
    homepageEnabled: boolean;
    marshmallowEnabled: boolean;
  };
  externalPagesDomain: TalentExternalPagesDomain;
}
