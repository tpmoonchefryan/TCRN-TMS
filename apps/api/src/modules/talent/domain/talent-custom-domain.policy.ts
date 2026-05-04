// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
} from '@tcrn/shared';

export type CustomDomainOwnerType = 'tenant' | 'subsidiary' | 'talent';
export type CustomDomainRouteMode = 'dedicated_talent' | 'scoped_talent_path';

export interface TalentLegacyCustomDomainConfig {
  talentId: string;
  talentCode: string;
  subsidiaryId: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: string;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
}

export interface TalentCustomDomainConfig {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: string;
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
  customDomainSslMode: string;
  isActive: boolean;
  ownerDepth: number | null;
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
  customDomainSslMode: string;
  routeMode: CustomDomainRouteMode;
  routePrefix: string | null;
  homepagePath: string;
  marshmallowPath: string;
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
