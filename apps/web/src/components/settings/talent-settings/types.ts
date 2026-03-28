// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type TalentSettingsTab =
  | 'details'
  | 'config'
  | 'dictionary'
  | 'security'
  | 'settings'
  | 'scope';

export interface ExternalPageDomainConfig {
  isPublished?: boolean;
  isEnabled?: boolean;
  path?: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
}

export interface ProfileStoreInfo {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isDefault: boolean;
  piiProxyUrl: string | null;
}

export interface TalentData {
  id: string;
  code: string;
  displayName: string;
  avatarUrl: string | null;
  path: string;
  subsidiaryId: string | null;
  subsidiaryName: string | null;
  profileStoreId: string | null;
  profileStore: ProfileStoreInfo | null;
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
  externalPagesDomain: {
    homepage: ExternalPageDomainConfig | null;
    marshmallow: ExternalPageDomainConfig | null;
  };
}
