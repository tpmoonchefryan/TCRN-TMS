// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { defaultLocale, locales } from './i18n/request';
import { fetchPublicDomainLookup } from './lib/api/modules/public-domain-lookup-fetch';

function extractHostname(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    const normalized = value.replace(/^https?:\/\//, '');
    const hostname = normalized.split('/')[0]?.split(':')[0]?.toLowerCase();
    return hostname || null;
  }
}

// Main domains that should NOT be processed for custom domain routing
const MAIN_DOMAINS = Array.from(new Set([
  'localhost',
  'tcrn.app',
  'tcrn.local',
  '127.0.0.1',
  extractHostname(process.env.NEXT_PUBLIC_APP_URL),
  extractHostname(process.env.NEXT_PUBLIC_API_URL),
  extractHostname(process.env.API_URL),
].filter((value): value is string => Boolean(value))));

// System subdomain suffixes for automatic routing
const MARSHMALLOW_SUBDOMAIN_SUFFIX = '.m.tcrn.app';
const HOMEPAGE_SUBDOMAIN_SUFFIX = '.p.tcrn.app';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// In-memory domain mapping cache (use Redis in production)
const domainCache = new Map<string, { homepagePath: string; marshmallowPath: string; expiry: number }>();
const DOMAIN_CACHE_TTL_MS = 30 * 1000;
const DOMAIN_CACHE_MAX_ENTRIES = 256;

function pruneExpiredDomainCacheEntries(now: number): void {
  for (const [domain, cached] of domainCache) {
    if (cached.expiry <= now) {
      domainCache.delete(domain);
    }
  }
}

function rememberDomainMapping(
  domain: string,
  mapping: { homepagePath: string; marshmallowPath: string },
  now: number,
): void {
  pruneExpiredDomainCacheEntries(now);

  if (domainCache.has(domain)) {
    domainCache.delete(domain);
  }

  while (domainCache.size >= DOMAIN_CACHE_MAX_ENTRIES) {
    const oldestDomain = domainCache.keys().next().value;

    if (!oldestDomain) {
      break;
    }

    domainCache.delete(oldestDomain);
  }

  domainCache.set(domain, {
    homepagePath: mapping.homepagePath,
    marshmallowPath: mapping.marshmallowPath,
    expiry: now + DOMAIN_CACHE_TTL_MS,
  });
}

export function resetDomainCacheForTests(): void {
  domainCache.clear();
}

/**
 * Check if the hostname is a main/development domain that should not be processed
 */
function isMainDomain(hostname: string): boolean {
  return MAIN_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
}

/**
 * Extract talent code from system subdomain
 */
function extractTalentFromSubdomain(hostname: string): { talentCode: string; type: 'marshmallow' | 'homepage' } | null {
  if (hostname.endsWith(MARSHMALLOW_SUBDOMAIN_SUFFIX)) {
    const talentCode = hostname.replace(MARSHMALLOW_SUBDOMAIN_SUFFIX, '');
    if (talentCode && !talentCode.includes('.')) {
      return { talentCode, type: 'marshmallow' };
    }
  }
  
  if (hostname.endsWith(HOMEPAGE_SUBDOMAIN_SUFFIX)) {
    const talentCode = hostname.replace(HOMEPAGE_SUBDOMAIN_SUFFIX, '');
    if (talentCode && !talentCode.includes('.')) {
      return { talentCode, type: 'homepage' };
    }
  }
  
  return null;
}

/**
 * Get domain mapping from cache or API (production only)
 */
async function getDomainMapping(domain: string): Promise<{ homepagePath: string; marshmallowPath: string } | null> {
  // Skip API calls in development to avoid blocking
  if (isDevelopment) {
    return null;
  }

  const now = Date.now();

  // Check cache first
  const cached = domainCache.get(domain);
  if (cached && cached.expiry > now) {
    domainCache.delete(domain);
    domainCache.set(domain, cached);
    return {
      homepagePath: cached.homepagePath,
      marshmallowPath: cached.marshmallowPath,
    };
  }

  if (cached) {
    domainCache.delete(domain);
  }

  const mapping = await fetchPublicDomainLookup(domain);
  if (!mapping) {
    return null;
  }

  // Keep the local cache short-lived and bounded until a shared invalidation path exists.
  rememberDomainMapping(domain, mapping, now);

  return mapping;
}

/**
 * Proxy for locale detection, domain routing, and setting
 * 
 * Note: We use 'never' locale prefix strategy - the locale is determined by
 * cookie or Accept-Language header, not from the URL path.
 * 
 * This allows URLs like /dashboard instead of /en/dashboard
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]; // Remove port

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check for system subdomains (e.g., luna.m.tcrn.app) before main-domain skip.
  // These hostnames are still under tcrn.app, so a pure "main domain" check would
  // otherwise short-circuit the intended public rewrite.
  const subdomainInfo = extractTalentFromSubdomain(hostname);
  if (subdomainInfo) {
    const basePath = subdomainInfo.type === 'marshmallow' ? '/m' : '/p';
    // Use new URL(request.url) to preserve query parameters (e.g., ?sso=xxx)
    const targetUrl = new URL(request.url);
    targetUrl.pathname = `${basePath}/${subdomainInfo.talentCode}${pathname}`;
    return NextResponse.rewrite(targetUrl);
  }

  // === Custom Domain Routing (only for non-main domains) ===
  if (!isMainDomain(hostname)) {
    // Handle custom domains (production only)
    const mapping = await getDomainMapping(hostname);
    if (mapping) {
      // Use new URL(request.url) to preserve query parameters (e.g., ?sso=xxx)
      const targetUrl = new URL(request.url);

      const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
      if (normalizedPathname === '/ask' || normalizedPathname.startsWith('/ask/')) {
        const subpath = normalizedPathname.slice(4);
        targetUrl.pathname = subpath
          ? `/m/${mapping.marshmallowPath}${subpath}`
          : `/m/${mapping.marshmallowPath}`;
        return NextResponse.rewrite(targetUrl);
      }

      targetUrl.pathname = normalizedPathname === '/'
        ? `/p/${mapping.homepagePath}`
        : `/p/${mapping.homepagePath}${normalizedPathname}`;
      return NextResponse.rewrite(targetUrl);
    }
  }

  // === Locale Detection and Setting ===

  // Check if URL starts with a locale prefix (legacy redirect)
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If URL has a locale prefix, redirect to the path without it
  // and set a cookie to remember the locale
  if (pathnameLocale) {
    const newPathname = pathname.replace(`/${pathnameLocale}`, '') || '/';
    const response = NextResponse.redirect(new URL(newPathname, request.url));
    response.cookies.set('NEXT_LOCALE', pathnameLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  }

  // Get locale from cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return NextResponse.next();
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  let detectedLocale = defaultLocale;

  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => (locales as readonly string[]).includes(lang));
    if (preferredLocale) {
      detectedLocale = preferredLocale as typeof defaultLocale;
    }
  }

  // Set locale cookie for future requests
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
