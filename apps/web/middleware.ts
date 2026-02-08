// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NextRequest, NextResponse } from 'next/server';

// Custom domain routing middleware
// Intercepts requests from custom domains and rewrites to appropriate internal paths

// Cache for custom domain lookups (in-memory, resets on deploy)
const domainCache = new Map<string, {
  talentPath: string;
  homepagePath: string;
  marshmallowPath: string;
  expiresAt: number;
} | null>();

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Known app domains that should not be treated as custom domains
const APP_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'tcrn.app',
  // Add your production domains here
];

function isAppDomain(hostname: string): boolean {
  // Check if this is a known app domain or subdomain
  const lowerHost = hostname.toLowerCase();
  return APP_DOMAINS.some(domain => 
    lowerHost === domain || 
    lowerHost.endsWith(`.${domain}`)
  );
}

async function lookupCustomDomain(hostname: string): Promise<{
  talentPath: string;
  homepagePath: string;
  marshmallowPath: string;
} | null> {
  // Check cache first
  const cached = domainCache.get(hostname);
  if (cached !== undefined && cached !== null && cached.expiresAt > Date.now()) {
    return cached;
  }
  if (cached === null) {
    return null;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/api/v1/public/domain-lookup/${encodeURIComponent(hostname)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Cache negative result for a shorter time
      domainCache.set(hostname, null);
      setTimeout(() => domainCache.delete(hostname), 30000); // 30s negative cache
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      domainCache.set(hostname, null);
      setTimeout(() => domainCache.delete(hostname), 30000);
      return null;
    }

    const result = {
      talentPath: data.data.talentPath,
      homepagePath: data.data.homepagePath || data.data.talentPath,
      marshmallowPath: data.data.marshmallowPath || data.data.talentPath,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    domainCache.set(hostname, result);
    return result;
  } catch (error) {
    console.error('Custom domain lookup failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0] || '';
  const pathname = request.nextUrl.pathname;
  
  // Skip if this is a known app domain
  if (isAppDomain(hostname)) {
    return NextResponse.next();
  }

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Lookup custom domain configuration
  const domainConfig = await lookupCustomDomain(hostname);
  
  if (!domainConfig) {
    // Unknown domain - let the request through (will 404 if no matching route)
    return NextResponse.next();
  }

  const { talentPath, homepagePath, marshmallowPath } = domainConfig;

  // Custom domain uses simplified routing:
  // - Root path (/) -> Homepage /p/{homepagePath}
  // - /ask path -> Marshmallow /m/{marshmallowPath}
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

  // Check if request matches marshmallow path (/ask or /ask/*)
  if (
    normalizedPathname === '/ask' ||
    normalizedPathname.startsWith('/ask/')
  ) {
    // Rewrite to marshmallow route
    const subpath = normalizedPathname.slice(4); // Remove '/ask'
    const targetPath = subpath ? `/m/${marshmallowPath}${subpath}` : `/m/${marshmallowPath}`;
    
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    return NextResponse.rewrite(url);
  }

  // Everything else goes to homepage
  // / -> /p/{homepagePath}
  // /about -> /p/{homepagePath}/about
  const targetPath = normalizedPathname === '/' 
    ? `/p/${homepagePath}` 
    : `/p/${homepagePath}${normalizedPathname}`;
  
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  return NextResponse.rewrite(url);
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
