function normalizePublicRouteSegment(code: string): string {
  return code.trim().toLowerCase();
}

function normalizeAppUrl(appUrl: string): string {
  return appUrl.replace(/\/+$/, '');
}

export const FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH = 'homepage';
export const FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH = 'marshmallow';

export function buildSharedHomepagePath(tenantCode: string, talentCode: string): string {
  return `/${normalizePublicRouteSegment(tenantCode)}/${normalizePublicRouteSegment(talentCode)}/${FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH}`;
}

export function buildSharedMarshmallowPath(tenantCode: string, talentCode: string): string {
  return `/${normalizePublicRouteSegment(tenantCode)}/${normalizePublicRouteSegment(talentCode)}/${FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH}`;
}

export function buildSharedHomepageUrl(appUrl: string, tenantCode: string, talentCode: string): string {
  return `${normalizeAppUrl(appUrl)}${buildSharedHomepagePath(tenantCode, talentCode)}`;
}

export function buildSharedMarshmallowUrl(appUrl: string, tenantCode: string, talentCode: string): string {
  return `${normalizeAppUrl(appUrl)}${buildSharedMarshmallowPath(tenantCode, talentCode)}`;
}
