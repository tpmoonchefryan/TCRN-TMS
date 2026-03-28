// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  TalentExternalPageDomainConfig,
  TalentExternalPagesDomain,
  TalentProfileStoreSummary,
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
