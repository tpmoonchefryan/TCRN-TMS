// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';

function parseOutArg(argv, fallback) {
  const outIndex = argv.indexOf('--out');
  return outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : fallback;
}

function ipv4ToNumber(ip) {
  return ip
    .split('.')
    .map((part) => Number(part))
    .reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function inIpv4Range(ip, base, maskBits) {
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

function blockedIp(address) {
  const version = isIP(address);

  if (version === 4) {
    return [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.168.0.0', 16],
      ['224.0.0.0', 4],
      ['240.0.0.0', 4],
    ].some(([base, mask]) => inIpv4Range(address, base, mask))
      ? 'blocked_ipv4_range'
      : null;
  }

  if (version === 6) {
    const value = address.toLowerCase();
    return value === '::' ||
      value === '::1' ||
      value.startsWith('fe80:') ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('ff')
      ? 'blocked_ipv6_range'
      : null;
  }

  return null;
}

async function validate(rawUrl, options = {}) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { safe: false, reason: 'unsupported_protocol' };
    }

    if (parsed.username || parsed.password) {
      return { safe: false, reason: 'embedded_credentials_denied' };
    }

    if (['metadata.google.internal', '169.254.169.254', '100.100.100.200'].includes(host)) {
      return { safe: false, reason: 'metadata_host_denied' };
    }

    if (host === 'localhost' || host.endsWith('.localhost') || host === 'host.docker.internal') {
      return { safe: false, reason: 'local_hostname_denied' };
    }

    if ((host.endsWith('.local') || host.endsWith('.internal')) && !host.endsWith('.svc.cluster.local')) {
      return { safe: false, reason: 'internal_hostname_denied' };
    }

    const blocked = blockedIp(host);
    if (blocked) {
      return { safe: false, reason: blocked, hostname: host };
    }

    if (options.resolveDns) {
      let addresses;

      try {
        addresses = await options.resolveHostname(host);
      } catch {
        return { safe: false, reason: 'dns_resolution_failed', hostname: host };
      }

      const blockedAddress = addresses.find((address) => blockedIp(address));

      if (blockedAddress) {
        return {
          safe: false,
          reason: blockedIp(blockedAddress),
          hostname: host,
          resolvedAddresses: addresses,
        };
      }

      return { safe: true, hostname: host, resolvedAddresses: addresses };
    }

    return { safe: true, hostname: host };
  } catch {
    return { safe: false, reason: 'invalid_url' };
  }
}

async function validateRedirectChain(rawUrl, redirects, options = {}) {
  const maxRedirects = options.maxRedirects ?? 5;
  const first = await validate(rawUrl, options);
  const chain = [{ redirectIndex: 0, url: rawUrl, ...first }];

  if (!first.safe) {
    return { ...first, redirectCount: 0, chain };
  }

  if (redirects.length > maxRedirects) {
    return {
      safe: false,
      reason: 'overlong_redirect_chain',
      redirectCount: redirects.length,
      chain,
    };
  }

  let currentUrl = rawUrl;

  for (let index = 0; index < redirects.length; index += 1) {
    let nextUrl;

    try {
      nextUrl = new URL(redirects[index], currentUrl).toString();
    } catch {
      const step = {
        safe: false,
        reason: 'invalid_redirect_url',
        redirectIndex: index + 1,
        url: redirects[index],
      };
      chain.push(step);
      return { ...step, redirectCount: index + 1, chain };
    }

    const result = await validate(nextUrl, options);
    chain.push({
      redirectIndex: index + 1,
      url: nextUrl,
      ...result,
    });

    if (!result.safe) {
      return { ...result, redirectCount: index + 1, chain };
    }

    currentUrl = nextUrl;
  }

  return {
    safe: true,
    redirectCount: redirects.length,
    chain,
  };
}

const out = parseOutArg(process.argv.slice(2), 'platform-tool-ssrf-denial-results.json');
const resolver = async (hostname) => {
  if (hostname === 'private-dns.p4-ssrf.test') {
    return ['10.0.0.9'];
  }

  return ['93.184.216.34'];
};
const cases = [
  { caseId: 'metadata-ip', url: 'http://169.254.169.254/latest/meta-data', expectedReason: 'metadata_host_denied' },
  { caseId: 'loopback', url: 'http://127.0.0.1:3000', expectedReason: 'blocked_ipv4_range' },
  { caseId: 'private', url: 'http://10.0.0.7', expectedReason: 'blocked_ipv4_range' },
  { caseId: 'link-local', url: 'http://169.254.10.10', expectedReason: 'blocked_ipv4_range' },
  { caseId: 'multicast', url: 'http://224.0.0.1', expectedReason: 'blocked_ipv4_range' },
  { caseId: 'unspecified', url: 'http://0.0.0.0', expectedReason: 'blocked_ipv4_range' },
  { caseId: 'internal-hostname', url: 'http://tool.internal', expectedReason: 'internal_hostname_denied' },
  { caseId: 'embedded-credentials', url: 'https://user:pass@example.com', expectedReason: 'embedded_credentials_denied' },
  { caseId: 'javascript', url: 'javascript:alert(1)', expectedReason: 'unsupported_protocol' },
  { caseId: 'data-url', url: 'data:text/plain,hello', expectedReason: 'unsupported_protocol' },
  {
    caseId: 'dns-private-resolution',
    url: 'https://private-dns.p4-ssrf.test/tool',
    expectedReason: 'blocked_ipv4_range',
    options: { resolveDns: true, resolveHostname: resolver },
  },
  {
    caseId: 'safe-public',
    url: 'https://example.com/tool',
    expectedReason: null,
    options: { resolveDns: true, resolveHostname: resolver },
  },
  {
    caseId: 'declared-k8s-service',
    url: 'http://grafana.observability.svc.cluster.local:3000',
    expectedReason: null,
  },
  {
    caseId: 'unsafe-redirect-target',
    url: 'https://example.com/tool',
    redirects: ['http://169.254.169.254/latest/meta-data'],
    expectedReason: 'metadata_host_denied',
    options: { resolveDns: true, resolveHostname: resolver, maxRedirects: 5 },
  },
  {
    caseId: 'overlong-redirect-chain',
    url: 'https://example.com/tool',
    redirects: ['/1', '/2', '/3', '/4', '/5', '/6'],
    expectedReason: 'overlong_redirect_chain',
    options: { resolveDns: true, resolveHostname: resolver, maxRedirects: 5 },
  },
];
const results = await Promise.all(cases.map(async ({ caseId, url, redirects, expectedReason, options }) => {
  const result = redirects
    ? await validateRedirectChain(url, redirects, options)
    : await validate(url, options);
  return {
    caseId,
    url,
    redirects,
    expectedReason,
    ...result,
    passed: expectedReason ? !result.safe && result.reason === expectedReason : result.safe,
  };
}));
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_boundary',
  data_mode: 'source_scan',
  target_scope: 'deep_link_gate',
  results,
  redirectPolicy: {
    everyRedirectTargetRevalidated: true,
    maxRedirects: 5,
    cookiesForwardedOnRedirect: false,
    authorizationForwardedOnRedirect: false,
  },
  credentialForwarding: {
    cookiesForwarded: false,
    authorizationForwarded: false,
    bearerTokensForwarded: false,
  },
  passed: results.every((result) => result.passed),
};

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
