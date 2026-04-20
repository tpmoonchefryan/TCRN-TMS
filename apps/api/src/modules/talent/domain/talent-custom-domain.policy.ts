// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
} from '@tcrn/shared';

export interface TalentCustomDomainConfig {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: string;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
}

export interface TalentCustomDomainSetResult {
  customDomain: string | null;
  token: string | null;
  txtRecord: string | null;
}

export interface TalentCustomDomainPaths {
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
}

export interface TalentCustomDomainVerificationResult {
  verified: boolean;
  message: string;
}

export const normalizeCustomDomain = (customDomain: string): string =>
  customDomain.toLowerCase().trim();

export const buildVerificationTxtRecord = (token: string): string =>
  `tcrn-verify=${token}`;

export const buildFixedCustomDomainPaths = (): TalentCustomDomainPaths => ({
  homepageCustomPath: FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  marshmallowCustomPath: FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
});
