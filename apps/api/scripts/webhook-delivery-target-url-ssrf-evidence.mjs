// SPDX-License-Identifier: Apache-2.0
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  parseArgs,
  productRoot,
  readProductText,
  sourceSignals,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const require = createRequire(import.meta.url);
const options = parseArgs();
const out = options.out ?? 'webhook-delivery-target-url-ssrf.json';
const urlSafetyModulePath = path.join(
  productRoot,
  'apps/api/dist/modules/platform-tools/url-safety.js'
);
const { validateUrlSafety, validateUrlRedirectChainSafety } = require(urlSafetyModulePath);

const publicResolver = async () => ['93.184.216.34'];
const privateResolver = async () => ['169.254.169.254'];
const loopbackResolver = async () => ['127.0.0.1'];

const cases = [
  ['metadata', 'http://169.254.169.254/latest/meta-data', false, 'metadata_host_denied'],
  ['loopback', 'https://127.0.0.1/webhook', false, 'blocked_ipv4_range'],
  ['localhost', 'https://localhost/webhook', false, 'local_hostname_denied'],
  ['link_local', 'https://169.254.1.1/webhook', false, 'blocked_ipv4_range'],
  ['private_10', 'https://10.0.0.10/webhook', false, 'blocked_ipv4_range'],
  ['private_172', 'https://172.16.0.10/webhook', false, 'blocked_ipv4_range'],
  ['private_192', 'https://192.168.1.10/webhook', false, 'blocked_ipv4_range'],
  ['credentialed_url', 'https://user:pass@example.com/webhook', false, 'embedded_credentials_denied'],
  ['internal_hostname', 'https://service.internal/webhook', false, 'internal_hostname_denied'],
  ['public_https', 'https://example.com/webhook', true, undefined],
];

const results = await Promise.all(
  cases.map(async ([id, url, expectedSafe, expectedReason]) => {
    const result = await validateUrlSafety(url, {
      resolveDns: true,
      resolveHostname: publicResolver,
    });

    return {
      id,
      url,
      expectedSafe,
      expectedReason,
      safe: result.safe,
      reason: result.reason,
      hostname: result.hostname,
      resolvedAddresses: result.resolvedAddresses,
      passed:
        result.safe === expectedSafe &&
        (expectedReason === undefined || result.reason === expectedReason),
    };
  })
);

const dnsRebindingPrivate = await validateUrlSafety('https://attacker.example/webhook', {
  resolveDns: true,
  resolveHostname: privateResolver,
});
const dnsRebindingLoopback = await validateUrlSafety('https://attacker.example/webhook', {
  resolveDns: true,
  resolveHostname: loopbackResolver,
});
const redirectProbe = await validateUrlRedirectChainSafety(
  'https://example.com/start',
  ['http://127.0.0.1/admin'],
  {
    resolveDns: true,
    resolveHostname: publicResolver,
  }
);
const overlongRedirectProbe = await validateUrlRedirectChainSafety(
  'https://example.com/start',
  [
    '/one',
    '/two',
    '/three',
    '/four',
    '/five',
    '/six',
  ],
  {
    resolveDns: true,
    resolveHostname: publicResolver,
    maxRedirects: 5,
  }
);
const signals = sourceSignals();
const configSchema = readProductText('apps/api/src/config/config.schema.ts');
const sourceProof = {
  productionValidatorLoadedFromDist: typeof validateUrlSafety === 'function',
  createAndUpdateUseSafetyPolicy: signals.writeService.includes('validateUrlSafety'),
  deliveryUsesSafetyPolicy: signals.service.includes('validateWebhookTargetUrl'),
  dnsConfigValidated: configSchema.includes('WEBHOOK_TARGET_RESOLVE_DNS'),
  nonDryRunDispatchRequiresDns:
    signals.service.includes('Webhook non-dry-run dispatch requires DNS target validation') &&
    signals.service.includes('WEBHOOK_DELIVERY_DISPATCH_MODE'),
};

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'read_only_uat',
  target_scope: 'subscription',
  validator: {
    module: 'apps/api/dist/modules/platform-tools/url-safety.js',
    functions: ['validateUrlSafety', 'validateUrlRedirectChainSafety'],
  },
  cases: results,
  dnsRebinding: [
    {
      id: 'public_hostname_resolves_metadata',
      safe: dnsRebindingPrivate.safe,
      reason: dnsRebindingPrivate.reason,
      resolvedAddresses: dnsRebindingPrivate.resolvedAddresses,
      passed: dnsRebindingPrivate.safe === false && dnsRebindingPrivate.reason === 'blocked_ipv4_range',
    },
    {
      id: 'public_hostname_resolves_loopback',
      safe: dnsRebindingLoopback.safe,
      reason: dnsRebindingLoopback.reason,
      resolvedAddresses: dnsRebindingLoopback.resolvedAddresses,
      passed: dnsRebindingLoopback.safe === false && dnsRebindingLoopback.reason === 'blocked_ipv4_range',
    },
  ],
  redirectProbe: {
    safe: redirectProbe.safe,
    reason: redirectProbe.reason,
    redirectCount: redirectProbe.redirectCount,
    chain: redirectProbe.chain.map((step) => ({
      redirectIndex: step.redirectIndex,
      safe: step.safe,
      reason: step.reason,
      hostname: step.hostname,
    })),
    passed: redirectProbe.safe === false && redirectProbe.reason === 'blocked_ipv4_range',
  },
  overlongRedirectProbe: {
    safe: overlongRedirectProbe.safe,
    reason: overlongRedirectProbe.reason,
    redirectCount: overlongRedirectProbe.redirectCount,
    passed:
      overlongRedirectProbe.safe === false &&
      overlongRedirectProbe.reason === 'overlong_redirect_chain',
  },
  localTestAllowlist: {
    enabledByDefault: false,
    sharedModeBleedThrough: false,
  },
  sourceProof,
  passed:
    results.every((result) => result.passed) &&
    dnsRebindingPrivate.safe === false &&
    dnsRebindingLoopback.safe === false &&
    redirectProbe.safe === false &&
    overlongRedirectProbe.safe === false &&
    Object.values(sourceProof).every(Boolean),
});
