// SPDX-License-Identifier: Apache-2.0
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface UrlSafetyOptions {
  allowKubernetesServiceHost?: boolean;
  resolveDns?: boolean;
  maxRedirects?: number;
  resolveHostname?: (hostname: string) => Promise<string[]>;
}

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
  hostname?: string;
  resolvedAddresses?: string[];
}

export interface UrlRedirectValidationStep extends UrlSafetyResult {
  url: string;
  redirectIndex: number;
}

export interface UrlRedirectChainSafetyResult extends UrlSafetyResult {
  redirectCount: number;
  chain: UrlRedirectValidationStep[];
}

const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  '169.254.169.254',
  '100.100.100.200',
]);

const LOCAL_HOSTS = new Set(['localhost', 'localhost.localdomain', 'host.docker.internal']);

function normalizeHost(hostname: string): string {
  return hostname.trim().replace(/^\[(.*)\]$/, '$1').toLowerCase();
}

function isKubernetesServiceHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return host.endsWith('.svc') || host.endsWith('.svc.cluster.local');
}

function ipv4ToNumber(ip: string): number {
  return ip
    .split('.')
    .map((part) => Number(part))
    .reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToNumber(ip);
  const inRange = (base: string, maskBits: number) => {
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (value & mask) === (ipv4ToNumber(base) & mask);
  };

  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.0.2.0', 24) ||
    inRange('192.168.0.0', 16) ||
    inRange('198.18.0.0', 15) ||
    inRange('198.51.100.0', 24) ||
    inRange('203.0.113.0', 24) ||
    inRange('224.0.0.0', 4) ||
    inRange('240.0.0.0', 4)
  );
}

function isBlockedIpv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === '::' ||
    value === '::1' ||
    value.startsWith('fe80:') ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('ff')
  );
}

function classifyBlockedAddress(address: string): string | undefined {
  const version = isIP(address);

  if (version === 4 && isBlockedIpv4(address)) {
    return 'blocked_ipv4_range';
  }

  if (version === 6 && isBlockedIpv6(address)) {
    return 'blocked_ipv6_range';
  }

  return undefined;
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}

export async function validateUrlSafety(
  rawUrl: string | null | undefined,
  options: UrlSafetyOptions = {}
): Promise<UrlSafetyResult> {
  if (!rawUrl || !rawUrl.trim()) {
    return { safe: false, reason: 'missing_url' };
  }

  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'invalid_url' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: 'unsupported_protocol' };
  }

  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'embedded_credentials_denied' };
  }

  const hostname = normalizeHost(parsed.hostname);

  if (!hostname) {
    return { safe: false, reason: 'missing_hostname' };
  }

  if (METADATA_HOSTS.has(hostname)) {
    return { safe: false, reason: 'metadata_host_denied', hostname };
  }

  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost')) {
    return { safe: false, reason: 'local_hostname_denied', hostname };
  }

  if (
    (hostname.endsWith('.local') || hostname.endsWith('.internal')) &&
    !(options.allowKubernetesServiceHost && isKubernetesServiceHost(hostname))
  ) {
    return { safe: false, reason: 'internal_hostname_denied', hostname };
  }

  const literalAddressBlock = classifyBlockedAddress(hostname);

  if (literalAddressBlock) {
    return { safe: false, reason: literalAddressBlock, hostname };
  }

  if (options.resolveDns) {
    const resolveHostname = options.resolveHostname ?? defaultResolveHostname;
    let addresses: string[];

    try {
      addresses = await resolveHostname(hostname);
    } catch {
      return {
        safe: false,
        reason: 'dns_resolution_failed',
        hostname,
        normalizedUrl: parsed.toString(),
      };
    }

    const blockedAddress = addresses.find((address) => classifyBlockedAddress(address));

    if (blockedAddress) {
      return {
        safe: false,
        reason: classifyBlockedAddress(blockedAddress),
        hostname,
        resolvedAddresses: addresses,
      };
    }

    return {
      safe: true,
      hostname,
      resolvedAddresses: addresses,
      normalizedUrl: parsed.toString(),
    };
  }

  return {
    safe: true,
    hostname,
    normalizedUrl: parsed.toString(),
  };
}

export async function validateUrlRedirectChainSafety(
  rawUrl: string | null | undefined,
  redirectLocations: string[],
  options: UrlSafetyOptions = {}
): Promise<UrlRedirectChainSafetyResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const chain: UrlRedirectValidationStep[] = [];
  const initial = await validateUrlSafety(rawUrl, options);
  const firstUrl = initial.normalizedUrl ?? rawUrl ?? '';

  chain.push({
    ...initial,
    url: firstUrl,
    redirectIndex: 0,
  });

  if (!initial.safe) {
    return {
      ...initial,
      redirectCount: 0,
      chain,
    };
  }

  if (redirectLocations.length > maxRedirects) {
    return {
      safe: false,
      reason: 'overlong_redirect_chain',
      normalizedUrl: initial.normalizedUrl,
      hostname: initial.hostname,
      resolvedAddresses: initial.resolvedAddresses,
      redirectCount: redirectLocations.length,
      chain,
    };
  }

  let currentUrl = initial.normalizedUrl ?? firstUrl;

  for (let index = 0; index < redirectLocations.length; index += 1) {
    let nextUrl: string;

    try {
      nextUrl = new URL(redirectLocations[index], currentUrl).toString();
    } catch {
      const invalidStep: UrlRedirectValidationStep = {
        safe: false,
        reason: 'invalid_redirect_url',
        url: redirectLocations[index],
        redirectIndex: index + 1,
      };

      chain.push(invalidStep);

      return {
        ...invalidStep,
        redirectCount: index + 1,
        chain,
      };
    }

    const step = await validateUrlSafety(nextUrl, options);
    const chainStep: UrlRedirectValidationStep = {
      ...step,
      url: step.normalizedUrl ?? nextUrl,
      redirectIndex: index + 1,
    };

    chain.push(chainStep);

    if (!step.safe) {
      return {
        ...step,
        redirectCount: index + 1,
        chain,
      };
    }

    currentUrl = step.normalizedUrl ?? nextUrl;
  }

  const lastStep = chain[chain.length - 1];

  return {
    safe: true,
    normalizedUrl: lastStep.normalizedUrl ?? lastStep.url,
    hostname: lastStep.hostname,
    resolvedAddresses: lastStep.resolvedAddresses,
    redirectCount: redirectLocations.length,
    chain,
  };
}
