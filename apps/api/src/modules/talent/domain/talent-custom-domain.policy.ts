// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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

export const normalizeCustomDomainPath = (
  path?: string,
): string | null => path?.trim().replace(/^\//, '') || null;
