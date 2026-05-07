// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
} from '@tcrn/shared';

export type CustomDomainOwnerType = 'tenant' | 'subsidiary' | 'talent';
export type CustomDomainRouteMode = 'dedicated_talent' | 'scoped_talent_path';
export type CustomDomainSslMode = 'auto' | 'self_hosted' | 'cloudflare';

export const CUSTOM_DOMAIN_OWNER_TYPES: CustomDomainOwnerType[] = [
  'tenant',
  'subsidiary',
  'talent',
];

export const CUSTOM_DOMAIN_SSL_MODES: CustomDomainSslMode[] = [
  'auto',
  'self_hosted',
  'cloudflare',
];

export interface TalentLegacyCustomDomainConfig {
  talentId: string;
  talentCode: string;
  subsidiaryId: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: CustomDomainSslMode;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
}

export interface TalentCustomDomainConfig {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: CustomDomainSslMode;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
  domains: TalentEffectiveCustomDomain[];
  inheritedDomains: TalentEffectiveCustomDomain[];
  selectedInheritedDomainIds: string[];
}

export interface TalentCustomDomainBindingRecord {
  id: string;
  hostname: string;
  ownerType: CustomDomainOwnerType;
  ownerId: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: CustomDomainSslMode;
  isActive: boolean;
  ownerDepth: number | null;
}

export interface TalentCustomDomainBindingCatalogItem extends TalentCustomDomainBindingRecord {
  inherited: boolean;
  selected: boolean;
  routeMode: CustomDomainRouteMode;
}

export interface TalentCustomDomainBindingListOptions {
  scopeType: CustomDomainOwnerType;
  scopeId: string | null;
  includeInherited: boolean;
  includeInactive: boolean;
  search?: string;
}

export interface TalentCustomDomainBindingListResult {
  domains: TalentCustomDomainBindingCatalogItem[];
}

export interface TalentEffectiveCustomDomain {
  id: string;
  hostname: string;
  ownerType: CustomDomainOwnerType;
  ownerId: string | null;
  ownerDepth: number | null;
  inherited: boolean;
  selected: boolean;
  customDomainVerified: boolean;
  customDomainSslMode: CustomDomainSslMode;
  isActive: boolean;
  routeMode: CustomDomainRouteMode;
  routePrefix: string | null;
  homepagePath: string;
  marshmallowPath: string;
}


export interface TalentCustomDomainBindingMutationInput {
  ownerType: CustomDomainOwnerType;
  ownerId: string | null;
  hostname: string;
  customDomainSslMode: CustomDomainSslMode;
  isActive: boolean;
}

export interface TalentCustomDomainBindingMutationResult {
  domain: TalentCustomDomainBindingRecord;
  token: string | null;
  txtRecord: string | null;
}

export type TalentCustomDomainSelectionResult = TalentCustomDomainConfig;

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
  customDomain.toLowerCase().trim().replace(/\.$/, '');

export function isCustomDomainOwnerType(value: string): value is CustomDomainOwnerType {
  return CUSTOM_DOMAIN_OWNER_TYPES.includes(value as CustomDomainOwnerType);
}

export function isCustomDomainSslMode(value: string): value is CustomDomainSslMode {
  return CUSTOM_DOMAIN_SSL_MODES.includes(value as CustomDomainSslMode);
}

export function isValidCustomDomainHostname(hostname: string): boolean {
  if (hostname.length < 4 || hostname.length > 255) {
    return false;
  }

  if (hostname.includes('://') || hostname.includes('/') || hostname.includes(':')) {
    return false;
  }

  if (hostname.startsWith('.') || hostname.endsWith('.') || hostname.includes('..')) {
    return false;
  }

  if (hostname.startsWith('*')) {
    return false;
  }

  const labels = hostname.split('.');
  if (labels.length < 2) {
    return false;
  }

  return labels.every((label) => (
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ));
}

export const buildVerificationTxtRecord = (token: string): string =>
  `tcrn-verify=${token}`;

export const buildFixedCustomDomainPaths = (): TalentCustomDomainPaths => ({
  homepageCustomPath: FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  marshmallowCustomPath: FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
});

function buildTalentDomainRoutes(routeMode: CustomDomainRouteMode, talentCode: string) {
  const routePrefix = routeMode === 'scoped_talent_path' ? talentCode : null;
  const pathPrefix = routePrefix ? `${routePrefix}/` : '';

  return {
    routePrefix,
    homepagePath: `${pathPrefix}${FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH}`,
    marshmallowPath: `${pathPrefix}${FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH}`,
  };
}

function getOwnerPrecedence(domain: TalentEffectiveCustomDomain): number {
  if (domain.ownerType === 'talent') {
    return 0;
  }

  if (domain.ownerType === 'subsidiary') {
    return 1;
  }

  return 2;
}

export function buildTalentEffectiveCustomDomains(params: {
  legacyConfig: TalentLegacyCustomDomainConfig;
  bindingRecords: TalentCustomDomainBindingRecord[];
  selectedInheritedDomainIds: string[];
}): TalentEffectiveCustomDomain[] {
  const selectedSet = new Set(params.selectedInheritedDomainIds);
  const domains = params.bindingRecords.map((record) => {
    const inherited = record.ownerType !== 'talent';
    const routeMode: CustomDomainRouteMode = inherited
      ? 'scoped_talent_path'
      : 'dedicated_talent';
    const routes = buildTalentDomainRoutes(routeMode, params.legacyConfig.talentCode);

    return {
      id: record.id,
      hostname: record.hostname,
      ownerType: record.ownerType,
      ownerId: record.ownerId,
      ownerDepth: record.ownerDepth,
      inherited,
      selected: inherited ? selectedSet.has(record.id) : true,
      customDomainVerified: record.customDomainVerified,
      customDomainSslMode: record.customDomainSslMode,
      isActive: record.isActive,
      routeMode,
      routePrefix: routes.routePrefix,
      homepagePath: routes.homepagePath,
      marshmallowPath: routes.marshmallowPath,
    } satisfies TalentEffectiveCustomDomain;
  });

  const hasTalentBindingForLegacyDomain = domains.some(
    (domain) =>
      domain.ownerType === 'talent' &&
      params.legacyConfig.customDomain !== null &&
      domain.hostname === params.legacyConfig.customDomain,
  );

  if (params.legacyConfig.customDomain && !hasTalentBindingForLegacyDomain) {
    const routes = buildTalentDomainRoutes('dedicated_talent', params.legacyConfig.talentCode);
    domains.push({
      id: `legacy:${params.legacyConfig.customDomain}`,
      hostname: params.legacyConfig.customDomain,
      ownerType: 'talent',
      ownerId: params.legacyConfig.talentId,
      ownerDepth: null,
      inherited: false,
      selected: true,
      customDomainVerified: params.legacyConfig.customDomainVerified,
      customDomainSslMode: params.legacyConfig.customDomainSslMode,
      isActive: true,
      routeMode: 'dedicated_talent',
      routePrefix: routes.routePrefix,
      homepagePath: routes.homepagePath,
      marshmallowPath: routes.marshmallowPath,
    });
  }

  return domains.sort((left, right) => {
    const precedenceDelta = getOwnerPrecedence(left) - getOwnerPrecedence(right);
    if (precedenceDelta !== 0) {
      return precedenceDelta;
    }

    if (left.ownerType === 'subsidiary' && right.ownerType === 'subsidiary') {
      return (right.ownerDepth ?? -1) - (left.ownerDepth ?? -1);
    }

    return left.hostname.localeCompare(right.hostname);
  });
}
