// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { validateUrlRedirectChainSafety, validateUrlSafety } from './url-safety';

describe('validateUrlSafety', () => {
  it.each([
    ['http://169.254.169.254/latest/meta-data', 'metadata_host_denied'],
    ['http://127.0.0.1:3000', 'blocked_ipv4_range'],
    ['http://10.0.0.5', 'blocked_ipv4_range'],
    ['http://[::1]/', 'blocked_ipv6_range'],
    ['javascript:alert(1)', 'unsupported_protocol'],
    ['data:text/plain,hello', 'unsupported_protocol'],
    ['https://user:pass@example.com', 'embedded_credentials_denied'],
    ['http://metadata.google.internal', 'metadata_host_denied'],
    ['http://service.internal', 'internal_hostname_denied'],
  ])('denies unsafe target %s', async (url, reason) => {
    await expect(validateUrlSafety(url)).resolves.toMatchObject({
      safe: false,
      reason,
    });
  });

  it('allows a declared Kubernetes service host for internal service metadata', async () => {
    await expect(
      validateUrlSafety('http://grafana.observability.svc.cluster.local:3000', {
        allowKubernetesServiceHost: true,
      })
    ).resolves.toMatchObject({
      safe: true,
      hostname: 'grafana.observability.svc.cluster.local',
    });
  });

  it('revalidates DNS answers when a resolver is provided', async () => {
    await expect(
      validateUrlSafety('https://grafana.example.com', {
        resolveDns: true,
        resolveHostname: async () => ['192.168.1.10'],
      })
    ).resolves.toMatchObject({
      safe: false,
      reason: 'blocked_ipv4_range',
    });

    await expect(
      validateUrlSafety('https://grafana.example.com', {
        resolveDns: true,
        resolveHostname: async () => ['93.184.216.34'],
      })
    ).resolves.toMatchObject({
      safe: true,
      resolvedAddresses: ['93.184.216.34'],
    });
  });

  it('revalidates redirect targets and enforces redirect limits', async () => {
    const resolver = async (hostname: string) =>
      hostname === 'example.com' ? ['93.184.216.34'] : ['127.0.0.1'];

    await expect(
      validateUrlRedirectChainSafety('https://example.com/tool', ['/safe-next'], {
        resolveDns: true,
        resolveHostname: resolver,
        maxRedirects: 5,
      })
    ).resolves.toMatchObject({
      safe: true,
      redirectCount: 1,
    });

    await expect(
      validateUrlRedirectChainSafety(
        'https://example.com/tool',
        ['http://169.254.169.254/latest/meta-data'],
        {
          resolveDns: true,
          resolveHostname: resolver,
          maxRedirects: 5,
        }
      )
    ).resolves.toMatchObject({
      safe: false,
      reason: 'metadata_host_denied',
      redirectCount: 1,
    });

    await expect(
      validateUrlRedirectChainSafety(
        'https://example.com/tool',
        ['/1', '/2', '/3', '/4', '/5', '/6'],
        {
          resolveDns: true,
          resolveHostname: resolver,
          maxRedirects: 5,
        }
      )
    ).resolves.toMatchObject({
      safe: false,
      reason: 'overlong_redirect_chain',
      redirectCount: 6,
    });
  });
});
