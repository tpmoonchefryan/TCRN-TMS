// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { defaultLocale, locales } from './i18n/request';

// Main domains that should NOT be processed for custom domain routing
const MAIN_DOMAINS = [
  'localhost',
  'tcrn.app',
  'tcrn.local',
  '127.0.0.1',
];

// System subdomain suffixes for automatic routing
const MARSHMALLOW_SUBDOMAIN_SUFFIX = '.m.tcrn.app';
const HOMEPAGE_SUBDOMAIN_SUFFIX = '.p.tcrn.app';

// API URL for domain lookup (only used in production)
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// In-memory domain mapping cache (use Redis in production)
const domainCache = new Map<string, { path: string; type: string; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
async function getDomainMapping(domain: string): Promise<{ path: string; type: string } | null> {
  // Skip API calls in development to avoid blocking
  if (isDevelopment) {
    return null;
  }

  // Check cache first
  const cached = domainCache.get(domain);
  if (cached && cached.expiry > Date.now()) {
    return { path: cached.path, type: cached.type };
  }

  try {
    // Query the backend API for domain mapping
    const res = await fetch(`${API_URL}/api/v1/public/domain-lookup?domain=${encodeURIComponent(domain)}`, {
      headers: {
        'Accept': 'application/json',
      },
      // Short timeout to avoid blocking
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    
    // Cache the result
    domainCache.set(domain, {
      path: data.path,
      type: data.type,
      expiry: Date.now() + CACHE_TTL,
    });

    return { path: data.path, type: data.type };
  } catch (error) {
    // Log error but don't block the request
    console.warn(`Domain lookup failed for ${domain}:`, error);
    return null;
  }
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

  // === Custom Domain Routing (only for non-main domains) ===
  if (!isMainDomain(hostname)) {
    // Check for system subdomains (e.g., luna.m.tcrn.app)
    const subdomainInfo = extractTalentFromSubdomain(hostname);
    if (subdomainInfo) {
      const basePath = subdomainInfo.type === 'marshmallow' ? '/m' : '/p';
      // Use new URL(request.url) to preserve query parameters (e.g., ?sso=xxx)
      const targetUrl = new URL(request.url);
      targetUrl.pathname = `${basePath}/${subdomainInfo.talentCode}${pathname}`;
      return NextResponse.rewrite(targetUrl);
    }

    // Handle custom domains (production only)
    const mapping = await getDomainMapping(hostname);
    if (mapping) {
      const basePath = mapping.type === 'marshmallow' ? '/m' : '/p';
      // Use new URL(request.url) to preserve query parameters (e.g., ?sso=xxx)
      const targetUrl = new URL(request.url);
      targetUrl.pathname = `${basePath}/${mapping.path}${pathname}`;
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
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return NextResponse.next();
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  let detectedLocale = defaultLocale;

  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => locales.includes(lang as any));
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
