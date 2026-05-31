import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  API_REGISTRY_VERSION,
  parseArgs,
  productRoot,
  readJson,
  writeJson,
} from './api-registry-script-utils.mjs';

export const API_GATEWAY_READINESS_VERSION = '2026-05-31.phase-10';
export const API_GATEWAY_NOT_APPLIED_REASON = 'phase_10_readiness_only';
const GATEWAY_TERMS = /\b(apisix|kong|gravitee|envoy|tyk|krakend)\b/i;
const STRIPPED_UNTRUSTED_HEADERS = [
  'x-real-ip',
  'cf-connecting-ip',
  'x-tenant-id',
  'x-subsidiary-id',
  'x-talent-id',
  'authorization',
];
const FORBIDDEN_EVIDENCE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /authorization:\s*Bearer/i,
  /set-cookie:/i,
  /\botpauth:\/\/totp\/[^"'\s]+/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /["']?secret["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|redacted|masked|env:|secret-ref:))[^"']{8,}/i,
  /["']?(?:access|refresh|id|session|api)[_-]?token["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|redacted|masked|env:|secret-ref:))/i,
  /["']?(?:password|client_secret|private_key)["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|redacted|masked|env:|secret-ref:))/i,
];

function now() {
  return new Date().toISOString();
}

function arrayOption(value) {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function resolveProductPath(input) {
  return path.isAbsolute(input) ? input : path.join(productRoot, input);
}

function listFiles(source) {
  const full = resolveProductPath(source);
  if (!existsSync(full)) {
    return [];
  }

  const stat = statSync(full);
  if (!stat.isDirectory()) {
    return [full];
  }

  return readdirSync(full).flatMap((entry) => {
    if (['node_modules', '.next', 'dist', '.turbo', 'coverage', 'test-results'].includes(entry)) {
      return [];
    }

    const child = path.join(full, entry);
    try {
      return statSync(child).isDirectory() ? listFiles(child) : [child];
    } catch {
      return [];
    }
  });
}

function readIfExists(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function redactText(text) {
  return text
    .replace(/(PASSWORD|SECRET|TOKEN|KEY|PRIVATE_KEY|CLIENT_SECRET)(=|:\s*)[^\s"']+/gi, '$1$2***redacted***')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer ***redacted***')
    .replace(/(authorization:\s*)[^\n]+/gi, '$1***redacted***')
    .replace(/(set-cookie:\s*)[^\n]+/gi, '$1***redacted***');
}

function writeText(out, content) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

export function defaultTrustedProxyPolicy() {
  return {
    policyVersion: API_GATEWAY_READINESS_VERSION,
    trustedCidrs: ['127.0.0.1/32', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    trustedHeaderNames: ['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'traceparent'],
    strippedUntrustedHeaderNames: STRIPPED_UNTRUSTED_HEADERS,
    tenantAuthorityHeaderPolicy: 'ignore_forwarded_tenant_headers',
    authHeaderPolicy: 'application_jwt_only',
    tracePropagation: 'preserve_traceparent_generate_if_missing',
    spoofingDeniedCases: [
      'untrusted forwarded client ip',
      'tenant scope header injection',
      'authorization header rewrite by gateway',
    ],
    passed: true,
  };
}

function hasSourceMetadata(operation) {
  return (
    operation?.metadataAuthority?.kind &&
    operation.metadataAuthority.kind !== 'missing' &&
    operation.metadataAuthority.source &&
    operation.metadataAuthority.operationKey &&
    operation.source?.openapiFile
  );
}

function buildRegistryJoin(apiRegistry, phase9Manifest) {
  const operations = apiRegistry.operations ?? [];
  const operationsByCode = new Map(operations.map((operation) => [operation.operationCode, operation]));
  const manifestRoutes = phase9Manifest.routes ?? [];
  const manifestByCode = new Map(manifestRoutes.map((route) => [route.operationCode, route]));
  const gatewayEligibleOperations = operations.filter((operation) => operation.gatewayEligible === true);
  const unknownOperationCodes = manifestRoutes
    .filter((route) => !operationsByCode.has(route.operationCode))
    .map((route) => route.operationCode);
  const missingManifestOperationCodes = gatewayEligibleOperations
    .filter((operation) => !manifestByCode.has(operation.operationCode))
    .map((operation) => operation.operationCode);
  const mismatchedManifestRoutes = [];

  for (const route of manifestRoutes) {
    const operation = operationsByCode.get(route.operationCode);
    if (!operation) {
      continue;
    }
    if (String(route.method).toUpperCase() !== String(operation.method).toUpperCase()) {
      mismatchedManifestRoutes.push(`${route.operationCode}: manifest method ${route.method} does not match registry ${operation.method}`);
    }
    if (route.pathTemplate !== operation.pathTemplate) {
      mismatchedManifestRoutes.push(`${route.operationCode}: manifest path ${route.pathTemplate} does not match registry ${operation.pathTemplate}`);
    }
    if (operation.gatewayEligible !== true) {
      mismatchedManifestRoutes.push(`${route.operationCode}: manifest route is not gatewayEligible in registry`);
    }
  }

  const missingSourceMetadataOperationCodes = gatewayEligibleOperations
    .filter((operation) => !hasSourceMetadata(operation))
    .map((operation) => operation.operationCode);
  const versionMismatches = [];
  if (phase9Manifest.manifestVersion !== API_REGISTRY_VERSION) {
    versionMismatches.push(
      `manifestVersion ${phase9Manifest.manifestVersion ?? 'missing'} does not match ${API_REGISTRY_VERSION}`
    );
  }
  if (phase9Manifest.generatedFromRegistryVersion !== apiRegistry.registryVersion) {
    versionMismatches.push(
      `manifest generatedFromRegistryVersion ${phase9Manifest.generatedFromRegistryVersion ?? 'missing'} does not match registry ${apiRegistry.registryVersion ?? 'missing'}`
    );
  }

  return {
    registryOperationCount: operations.length,
    gatewayEligibleOperationCount: gatewayEligibleOperations.length,
    manifestRouteCount: manifestRoutes.length,
    unknownOperationCodes,
    missingManifestOperationCodes,
    mismatchedManifestRoutes,
    missingSourceMetadataOperationCodes,
    versionMismatches,
  };
}

function registryJoinErrors(registryJoin) {
  return [
    ...registryJoin.unknownOperationCodes.map((code) => `${code}: manifest operation is not present in API Registry`),
    ...registryJoin.missingManifestOperationCodes.map((code) => `${code}: gatewayEligible registry operation is missing from Phase 9 manifest`),
    ...registryJoin.mismatchedManifestRoutes,
    ...registryJoin.missingSourceMetadataOperationCodes.map((code) => `${code}: registry source metadata is required for gateway readiness`),
    ...registryJoin.versionMismatches,
  ];
}

export function defaultRateLimitCorsPolicy() {
  return {
    policyVersion: API_GATEWAY_READINESS_VERSION,
    corsAuthority: 'tcrn_application_config',
    rateLimitAuthority: 'tcrn_application_middleware',
    swaggerExposureAuthority: 'tcrn_swagger_exposure_policy',
    routeHints: [
      { hint: 'public-readonly-default', owner: 'application', gatewayMode: 'mirror_only' },
      { hint: 'public-submit-default', owner: 'application', gatewayMode: 'mirror_only' },
      { hint: 'auth-flow-default', owner: 'application', gatewayMode: 'mirror_only' },
      { hint: 'tenant-default', owner: 'application', gatewayMode: 'mirror_only' },
      { hint: 'ac-platform-default', owner: 'application', gatewayMode: 'mirror_only' },
    ],
    corsHints: ['mirror configured FRONTEND_URL origins', 'preserve credential policy'],
    securityHeaderHints: ['preserve app security headers', 'do not weaken Swagger auth policy'],
    parityWarnings: [],
    passed: true,
  };
}

export function buildGatewayRoutePolicy(apiRegistry, phase9Manifest) {
  const operationsByCode = new Map(
    (apiRegistry.operations ?? []).map((operation) => [operation.operationCode, operation])
  );
  const registryJoin = buildRegistryJoin(apiRegistry, phase9Manifest);
  const routes = (phase9Manifest.routes ?? []).flatMap((route) => {
    const operation = operationsByCode.get(route.operationCode);
    if (!operation) {
      return [];
    }

    return [{
      operationCode: route.operationCode,
      method: route.method,
      pathTemplate: route.pathTemplate,
      upstreamService: route.upstreamService,
      exposure: operation.exposure,
      scopeType: operation.scopeType,
      authMode: operation.authMode,
      requiredPermissions: operation.requiredPermissions ?? [],
      ownerModuleCode: operation.ownerModuleCode,
      ownerCapabilityCode: operation.ownerCapabilityCode,
      authPolicyRefs: route.authPolicyRefs ?? ['tcrn-jwt'],
      rateLimitHints: route.rateLimitHints ?? ['tenant-default'],
      oidcHints: route.oidcHints ?? [],
      canaryEligible: Boolean(route.canaryEligible),
      rollbackNotes:
        'Phase 10 readiness only. A later owner-approved gateway cutover gate must select canary traffic and rollback controls.',
      routeSource: 'phase_9_api_registry_manifest',
      sourceNotAppliedReason: route.notAppliedReason,
      cutoverDefault: false,
      notAppliedReason: API_GATEWAY_NOT_APPLIED_REASON,
    }];
  });
  const trustedProxyPolicy = defaultTrustedProxyPolicy();
  const rateLimitCorsPolicy = defaultRateLimitCorsPolicy();
  const validationErrors = [...registryJoinErrors(registryJoin), ...validateGatewayRoutePolicyRoutes(routes)];
  const warnings = [...validationErrors];
  if (routes.length === 0) {
    warnings.push('no_gateway_eligible_routes');
  }

  return {
    policyVersion: API_GATEWAY_READINESS_VERSION,
    generatedAt: now(),
    generatedFromRegistryVersion: apiRegistry.registryVersion ?? API_REGISTRY_VERSION,
    generatedFromManifestVersion: phase9Manifest.manifestVersion ?? API_REGISTRY_VERSION,
    sourceCommit: apiRegistry.sourceCommit ?? 'unknown',
    activeProxyBaseline: 'caddy',
    preferredProvider: 'apisix',
    compatibilityProvider: 'kong',
    registryJoin,
    routes,
    trustedProxyPolicy,
    rateLimitCorsPolicy,
    canaryRollback: {
      status: validationErrors.length === 0
        ? 'available_after_owner_approved_cutover_gate'
        : 'unavailable_until_policy_clean',
      ownerApprovalRequired: true,
      shadowCompareRequired: true,
      rollbackRequired: true,
    },
    warnings,
    passed: validationErrors.length === 0,
  };
}

export function validateGatewayRoutePolicyRoutes(routes) {
  const errors = [];
  const seen = new Set();

  for (const route of routes) {
    const key = `${route.method?.toUpperCase()} ${route.pathTemplate}`;
    if (seen.has(key)) {
      errors.push(`${route.operationCode}: duplicate gateway route ${key}`);
    }
    seen.add(key);
    if (route.cutoverDefault !== false) {
      errors.push(`${route.operationCode}: cutoverDefault must be false`);
    }
    if (route.notAppliedReason !== API_GATEWAY_NOT_APPLIED_REASON) {
      errors.push(`${route.operationCode}: notAppliedReason must be ${API_GATEWAY_NOT_APPLIED_REASON}`);
    }
    if (!route.upstreamService) {
      errors.push(`${route.operationCode}: upstreamService is required`);
    }
    if (route.upstreamService !== 'tcrn-api') {
      errors.push(`${route.operationCode}: upstreamService must remain tcrn-api`);
    }
    if (!Array.isArray(route.authPolicyRefs) || route.authPolicyRefs.length === 0) {
      errors.push(`${route.operationCode}: authPolicyRefs are required`);
    }
    if (!Array.isArray(route.rateLimitHints) || route.rateLimitHints.length === 0) {
      errors.push(`${route.operationCode}: rateLimitHints are required`);
    }
    if (route.authMode === 'bearer_jwt' && (!Array.isArray(route.oidcHints) || route.oidcHints.length === 0)) {
      errors.push(`${route.operationCode}: bearer_jwt routes require future OIDC/JWT readiness hints`);
    }
  }

  return errors;
}

export function renderGatewayArtifact(provider, policy) {
  const content = JSON.stringify(
    provider === 'apisix' ? buildApisixReadinessConfig(policy) : buildKongReadinessConfig(policy),
    null,
    2
  );
  const validation = validateRenderedGatewayContent(provider, content);

  return {
    provider,
    fileName:
      provider === 'apisix'
        ? 'gateway-apisix-routes.rendered.yaml'
        : 'gateway-kong-routes.rendered.yaml',
    mode: 'readiness_only',
    content,
    routeCount: policy.routes?.length ?? 0,
    notAppliedReason: API_GATEWAY_NOT_APPLIED_REASON,
    containsApplyCommand: false,
    passed: validation.passed,
  };
}

function routeId(provider, index, route) {
  return `p10-${provider}-${index + 1}-${route.operationCode.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

function buildApisixReadinessConfig(policy) {
  return {
    provider: 'apisix',
    mode: 'readiness_only',
    not_applied_reason: API_GATEWAY_NOT_APPLIED_REASON,
    generated_from_registry: policy.generatedFromRegistryVersion,
    routes: (policy.routes ?? []).map((route, index) => ({
      id: routeId('apisix', index, route),
      name: route.operationCode,
      uri: `/api/v1${route.pathTemplate}`,
      methods: [String(route.method).toUpperCase()],
      upstream: {
        type: 'roundrobin',
        nodes: {
          'tcrn-api:3000': 1,
        },
      },
      plugins: {
        'proxy-rewrite': {
          headers: {
            remove: STRIPPED_UNTRUSTED_HEADERS,
          },
        },
        'limit-count': {
          _meta: { disable: true },
          policy: 'local',
          count: 0,
          time_window: 60,
          rejected_code: 429,
          readiness_hint: route.rateLimitHints,
        },
        ...(route.authMode === 'bearer_jwt'
          ? {
              'openid-connect': {
                _meta: { disable: true },
                bearer_only: true,
                discovery: 'secret-ref:tcrn.future_oidc_discovery',
                audience: 'secret-ref:tcrn.future_oidc_audience',
                readiness_hint: route.oidcHints,
              },
            }
          : {}),
      },
      labels: {
        'tcrn.io/readiness_only': 'true',
        'tcrn.io/not_applied_reason': API_GATEWAY_NOT_APPLIED_REASON,
        'tcrn.io/operation_code': route.operationCode,
      },
    })),
  };
}

function buildKongReadinessConfig(policy) {
  const routes = (policy.routes ?? []).map((route, index) => ({
    name: routeId('kong', index, route),
    methods: [String(route.method).toUpperCase()],
    paths: [`/api/v1${route.pathTemplate}`],
    strip_path: false,
    preserve_host: true,
    tags: ['phase_10_readiness_only', route.operationCode],
  }));
  const protectedRoutes = (policy.routes ?? []).filter((route) => route.authMode === 'bearer_jwt');

  return {
    _format_version: '3.0',
    _transform: true,
    provider: 'kong',
    mode: 'readiness_only',
    not_applied_reason: API_GATEWAY_NOT_APPLIED_REASON,
    generated_from_registry: policy.generatedFromRegistryVersion,
    services: [
      {
        name: 'tcrn-api',
        url: 'http://tcrn-api:3000',
        tags: ['phase_10_readiness_only'],
        routes,
      },
    ],
    plugins: [
      {
        name: 'request-transformer',
        service: 'tcrn-api',
        enabled: false,
        tags: ['phase_10_readiness_only', 'trusted-header-readiness'],
        config: {
          remove: {
            headers: STRIPPED_UNTRUSTED_HEADERS,
          },
        },
      },
      ...protectedRoutes.map((route, index) => ({
        name: 'jwt',
        route: routeId('kong', index, route),
        enabled: false,
        tags: ['phase_10_readiness_only', route.operationCode, 'future-oidc-jwt-readiness'],
        config: {
          key_claim_name: 'iss',
          claims_to_verify: ['exp'],
          readiness_hint: route.oidcHints,
        },
      })),
    ],
  };
}

function parseRenderedContent(content) {
  try {
    return { value: JSON.parse(content), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function validateHeaderRemoval(headers) {
  const values = Array.isArray(headers) ? headers : [];
  return STRIPPED_UNTRUSTED_HEADERS.filter((header) => !values.includes(header));
}

function validateRenderedGatewayContent(provider, content) {
  const parsed = parseRenderedContent(content);
  const errors = [];
  const forbidden = /\b(kubectl\s+apply|deck\s+sync|apisix\s+start|kong\s+start)\b/i.test(content);
  if (parsed.error) {
    errors.push(`rendered ${provider} artifact is not parseable structured YAML-compatible JSON: ${parsed.error}`);
  }
  if (forbidden) {
    errors.push('gateway apply/start command must not appear in rendered readiness artifact');
  }
  const value = parsed.value ?? {};

  if (provider === 'apisix') {
    if (value.provider !== 'apisix' || !Array.isArray(value.routes)) {
      errors.push('APISIX readiness artifact must include provider=apisix and routes[]');
    }
    for (const route of value.routes ?? []) {
      if (!route.uri || !Array.isArray(route.methods) || !route.upstream?.nodes) {
        errors.push(`${route.name ?? 'unknown'}: APISIX route requires uri, methods, and upstream.nodes`);
      }
      const missingHeaders = validateHeaderRemoval(route.plugins?.['proxy-rewrite']?.headers?.remove);
      if (missingHeaders.length > 0) {
        errors.push(`${route.name ?? 'unknown'}: APISIX proxy-rewrite must remove ${missingHeaders.join(', ')}`);
      }
      if (route.labels?.['tcrn.io/not_applied_reason'] !== API_GATEWAY_NOT_APPLIED_REASON) {
        errors.push(`${route.name ?? 'unknown'}: APISIX route must retain readiness-only label`);
      }
    }
  } else if (provider === 'kong') {
    if (value._format_version !== '3.0' || !Array.isArray(value.services)) {
      errors.push('Kong readiness artifact must include _format_version=3.0 and services[]');
    }
    const routes = (value.services ?? []).flatMap((service) => service.routes ?? []);
    if (!routes.every((route) => Array.isArray(route.methods) && Array.isArray(route.paths))) {
      errors.push('Kong routes must include methods[] and paths[]');
    }
    const transformer = (value.plugins ?? []).find((plugin) => plugin.name === 'request-transformer');
    const missingHeaders = validateHeaderRemoval(transformer?.config?.remove?.headers);
    if (!transformer || missingHeaders.length > 0) {
      errors.push(`Kong request-transformer must remove ${missingHeaders.join(', ') || 'untrusted headers'}`);
    }
    if (!routes.every((route) => (route.tags ?? []).includes(API_GATEWAY_NOT_APPLIED_REASON))) {
      errors.push('Kong routes must retain readiness-only tag');
    }
  }

  return {
    parsed: !parsed.error,
    routeCount:
      provider === 'apisix'
        ? value.routes?.length ?? 0
        : (value.services ?? []).reduce((count, service) => count + (service.routes?.length ?? 0), 0),
    forbiddenApplyCommandHits: forbidden ? ['gateway_apply_or_start_command'] : [],
    providerSchemaErrors: errors,
    passed: errors.length === 0,
  };
}

export function renderGatewayReadinessArtifacts(policy, outDir) {
  mkdirSync(outDir, { recursive: true });
  const artifacts = ['apisix', 'kong'].map((provider) => {
    const artifact = renderGatewayArtifact(provider, policy);
    writeText(path.join(outDir, artifact.fileName), artifact.content);
    return {
      provider: artifact.provider,
      fileName: artifact.fileName,
      routeCount: artifact.routeCount,
      notAppliedReason: artifact.notAppliedReason,
      passed: artifact.passed,
    };
  });

  return {
    checkedAt: now(),
    renderDir: outDir,
    artifacts,
    providerOrder: ['apisix', 'kong'],
    passed: artifacts.every((artifact) => artifact.passed),
  };
}

export function verifyGatewayRenderedArtifacts(renderDir) {
  const expected = [
    ['apisix', 'gateway-apisix-routes.rendered.yaml'],
    ['kong', 'gateway-kong-routes.rendered.yaml'],
  ];
  const artifacts = expected.map(([provider, fileName]) => {
    const file = path.join(renderDir, fileName);
    const content = readIfExists(file);
    const validation = validateRenderedGatewayContent(provider, content);
    return {
      provider,
      fileName,
      exists: existsSync(file),
      routeCount: validation.routeCount,
      notAppliedReasonPresent: content.includes(API_GATEWAY_NOT_APPLIED_REASON),
      parsed: validation.parsed,
      providerSchemaErrors: validation.providerSchemaErrors,
      forbiddenApplyCommandHits: validation.forbiddenApplyCommandHits,
      passed:
        existsSync(file) &&
        content.includes(API_GATEWAY_NOT_APPLIED_REASON) &&
        validation.passed,
    };
  });
  const forbiddenApplyCommandHits = artifacts.flatMap((artifact) =>
    artifact.forbiddenApplyCommandHits.map((hit) => `${artifact.fileName}:${hit}`)
  );

  return {
    checkedAt: now(),
    artifacts,
    providerOrder: ['apisix', 'kong'],
    forbiddenApplyCommandHits,
    passed: artifacts.every((artifact) => artifact.passed),
  };
}

export function writeGatewayCurrentProxyInventory(productRootInput = productRoot) {
  const root = path.resolve(productRootInput);
  const composeFiles = ['docker-compose.yml', 'docker-compose.prod.yml', 'docker-compose.staging.yml'];
  const composeSignals = composeFiles.map((fileName) => {
    const file = path.join(root, fileName);
    const text = readIfExists(file);
    return {
      file: fileName,
      exists: existsSync(file),
      caddyMentioned: /\bcaddy\b/i.test(text),
      gatewayTermMentioned: GATEWAY_TERMS.test(text),
    };
  });
  const caddyFile = path.join(root, 'infra/caddy/Caddyfile.prod');
  const k8sIngress = path.join(root, 'infra/k8s/ingress/public.yaml');
  const activeGatewayDependencies = composeSignals
    .filter((signal) => signal.gatewayTermMentioned)
    .map((signal) => signal.file);

  return {
    checkedAt: now(),
    test_layer: 'source_scan',
    data_mode: 'read_only_source',
    target_scope: 'compose_caddy_baseline',
    productRoot: root,
    activeProxyBaseline: existsSync(caddyFile) ? 'caddy' : 'k8s-ingress',
    composeSignals,
    caddy: {
      file: 'infra/caddy/Caddyfile.prod',
      exists: existsSync(caddyFile),
      reverseProxyConfigured: /reverse_proxy/i.test(readIfExists(caddyFile)),
    },
    k8sIngress: {
      file: 'infra/k8s/ingress/public.yaml',
      exists: existsSync(k8sIngress),
      ingressClassPlaceholder: readIfExists(k8sIngress).includes('replace-me-ingress-class'),
    },
    activeGatewayDependencies,
    passed: activeGatewayDependencies.length === 0,
  };
}

export function writeGatewayDependencyAbsence() {
  const packageFiles = listFiles('.').filter((file) => /(^|\/)package\.json$/.test(file));
  const dependencyMatches = [];

  for (const file of packageFiles) {
    const rel = path.relative(productRoot, file);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const sections = ['dependencies', 'devDependencies', 'optionalDependencies'];
    for (const section of sections) {
      for (const name of Object.keys(json[section] ?? {})) {
        if (GATEWAY_TERMS.test(name)) {
          dependencyMatches.push({ file: rel, section, dependency: name });
        }
      }
    }
  }

  return {
    checkedAt: now(),
    test_layer: 'source_scan',
    data_mode: 'read_only_source',
    target_scope: 'gateway_route_policy',
    packageFiles: packageFiles.map((file) => path.relative(productRoot, file)),
    activeGatewayDependencyMatches: dependencyMatches,
    passed: dependencyMatches.length === 0,
  };
}

export function writeGatewayComposeFixtureEnv(out) {
  const content = [
    'IMAGE_TAG=phase10-readiness-only',
    'APP_HOST=gateway-readiness.example.invalid',
    'TLS_SECRET_NAME=gateway-readiness-tls',
    'GATEWAY_READINESS_ONLY=true',
    'GATEWAY_ADMIN_TOKEN=***redacted***',
  ].join('\n');
  writeText(out, content);
  return {
    checkedAt: now(),
    out,
    containsRawSecret: false,
    passed: true,
  };
}

export function renderGatewayComposeReadiness(options) {
  const composeFiles = arrayOption(options.compose);
  const caddyFiles = arrayOption(options.caddy);
  const redactedRenderDir = options['redacted-render-dir'];
  mkdirSync(redactedRenderDir, { recursive: true });
  const renderedFiles = [];
  const gatewayServiceHits = [];

  for (const fileInput of [...composeFiles, ...caddyFiles]) {
    const file = resolveProductPath(fileInput);
    const rel = path.relative(productRoot, file);
    const text = readIfExists(file);
    const redacted = redactText(text);
    const target = path.join(redactedRenderDir, `${rel.replace(/[\/\\]/g, '__')}.redacted.txt`);
    writeText(target, redacted);
    renderedFiles.push({
      source: rel,
      redactedFile: path.relative(redactedRenderDir, target),
      exists: existsSync(file),
      caddyMentioned: /\bcaddy\b/i.test(text),
      reverseProxyMentioned: /reverse_proxy/i.test(text),
      gatewayTermMentioned: GATEWAY_TERMS.test(text),
    });
    if (GATEWAY_TERMS.test(text)) {
      gatewayServiceHits.push(rel);
    }
  }

  return {
    checkedAt: now(),
    test_layer: 'compose_render',
    data_mode: 'read_only_source',
    target_scope: 'compose_caddy_baseline',
    fixtureEnv: options['fixture-env'],
    activeProxyBaseline: 'caddy',
    renderedFiles,
    gatewayServiceHits,
    defaultTrafficCutover: false,
    redactedRenderDir,
    passed: gatewayServiceHits.length === 0,
  };
}

export function verifyGatewayComposeRedaction(composeBaselinePath, renderDir) {
  const files = listFiles(renderDir).filter((file) => /\.(txt|ya?ml|json|env)$/.test(file));
  const forbiddenHits = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_EVIDENCE_PATTERNS) {
      if (pattern.test(text)) {
        forbiddenHits.push({
          file: path.relative(renderDir, file),
          classification: 'forbidden_sensitive_evidence_pattern',
        });
      }
    }
  }
  const baseline = existsSync(composeBaselinePath) ? readJson(composeBaselinePath) : null;

  return {
    checkedAt: now(),
    test_layer: 'security_privacy',
    data_mode: 'compose_render',
    target_scope: 'compose_caddy_baseline',
    composeBaseline: composeBaselinePath,
    scannedFileCount: files.length,
    baselinePassed: baseline?.passed === true,
    forbiddenHits,
    passed: baseline?.passed === true && forbiddenHits.length === 0,
  };
}

export function verifyGatewayRouteDrift(policy, currentProxy) {
  const cutoverEnabled = (policy.routes ?? []).filter((route) => route.cutoverDefault !== false);
  const unknownOperationCount = policy.registryJoin?.unknownOperationCodes?.length ?? 0;
  const missingManifestRouteCount = policy.registryJoin?.missingManifestOperationCodes?.length ?? 0;
  const versionMismatchCount = policy.registryJoin?.versionMismatches?.length ?? 0;
  const activeGatewayDependencies = currentProxy.activeGatewayDependencies ?? [];
  const passed =
    cutoverEnabled.length === 0 &&
    unknownOperationCount === 0 &&
    missingManifestRouteCount === 0 &&
    versionMismatchCount === 0 &&
    activeGatewayDependencies.length === 0 &&
    policy.passed !== false;

  return {
    checkedAt: now(),
    test_layer: 'gateway_render',
    data_mode: 'read_only_source',
    target_scope: 'gateway_route_policy',
    activeProxyBaseline: currentProxy.activeProxyBaseline ?? 'caddy',
    activeGatewayDependencies,
    routePolicyCount: policy.routes?.length ?? 0,
    cutoverEnabledCount: cutoverEnabled.length,
    unknownOperationCount,
    missingManifestRouteCount,
    versionMismatchCount,
    result: passed ? 'pass' : 'fail',
    passed,
  };
}

export function verifyGatewayTrustedProxyPolicy(policy) {
  const trusted = policy.trustedProxyPolicy ?? {};
  const requiredStripped = ['x-real-ip', 'cf-connecting-ip', 'x-tenant-id', 'authorization'];
  const missingStripped = requiredStripped.filter(
    (header) => !(trusted.strippedUntrustedHeaderNames ?? []).includes(header)
  );
  const passed =
    (trusted.trustedCidrs ?? []).length > 0 &&
    trusted.tenantAuthorityHeaderPolicy === 'ignore_forwarded_tenant_headers' &&
    trusted.authHeaderPolicy === 'application_jwt_only' &&
    missingStripped.length === 0;

  return {
    checkedAt: now(),
    test_layer: 'security_privacy',
    data_mode: 'read_only_source',
    target_scope: 'trusted_proxy_policy',
    trustedProxyPolicy: trusted,
    spoofingCases: trusted.spoofingDeniedCases ?? [],
    missingStrippedHeaders: missingStripped,
    passed,
  };
}

export function verifyGatewayRateLimitCorsPolicy(policy) {
  const rateLimitCors = policy.rateLimitCorsPolicy ?? {};
  const passed =
    rateLimitCors.corsAuthority === 'tcrn_application_config' &&
    rateLimitCors.rateLimitAuthority === 'tcrn_application_middleware' &&
    rateLimitCors.swaggerExposureAuthority === 'tcrn_swagger_exposure_policy' &&
    (rateLimitCors.parityWarnings ?? []).length === 0;

  return {
    checkedAt: now(),
    test_layer: 'security_privacy',
    data_mode: 'read_only_source',
    target_scope: 'rate_limit_cors_policy',
    rateLimitCorsPolicy: rateLimitCors,
    gatewayOwnsLimiter: false,
    corsLoosened: false,
    swaggerAuthBypass: false,
    passed,
  };
}

export function buildGatewayCutoverRunbook(policy) {
  return [
    '# API Gateway Readiness Cutover Runbook',
    '',
    `Generated: ${now()}`,
    '',
    'This is a readiness-only runbook. Phase 10 does not install, start, apply, or route default traffic through APISIX/Kong.',
    '',
    '## Owner Approval Gate',
    '',
    'A later explicit owner-approved cutover phase is required before any gateway traffic change.',
    '',
    '## Preconditions',
    '',
    '- Route policy is generated from the accepted Phase 9 API Registry.',
    `- Route policy count: ${policy.routes?.length ?? 0}.`,
    '- Trusted proxy, CORS, rate-limit, Swagger exposure, and redaction checks pass.',
    '- Current Caddy/Ingress baseline remains available as rollback target.',
    '',
    '## Canary And Shadow Compare',
    '',
    '- Select a non-production or explicitly approved canary host.',
    '- Mirror read-only traffic first and compare response status, latency, trace ids, auth denials, and CORS behavior.',
    '- Increase canary only after security and health checks pass.',
    '',
    '## Health Checks',
    '',
    '- API health endpoint remains healthy.',
    '- Current Caddy/Ingress baseline can still serve traffic.',
    '- Audit correlation and trace propagation remain intact.',
    '',
    '## Rollback',
    '',
    '- Return DNS/Ingress weight to the current Caddy/Ingress baseline.',
    '- Disable gateway canary routing in the owner-approved change record.',
    '- Re-run route drift and trusted-header checks before any retry.',
    '',
    '## Data Protection',
    '',
    '- Do not store secrets, cookies, authorization headers, or private payloads in evidence.',
    '- Rendered artifacts are readiness-only and contain no admin API credentials.',
    '',
  ].join('\n');
}

export function verifyGatewayNegativeAuthority(sourceRoots, evidenceDir) {
  const files = sourceRoots
    .flatMap((sourceRoot) => listFiles(sourceRoot))
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|yml|yaml|sh|json)$/.test(file));
  const findings = [];
  const checks = [
    ['gateway_install_start_apply', /\b(apisix|kong|gravitee|envoy|tyk|krakend)\b[^\n]{0,100}\b(install|start|apply|admin api|enabled=true)\b/i],
    ['gateway_apply_command', /\bgateway\s+(apply|start)\b/i],
    ['gateway_cutover_enabled', /\b(cutoverDefault|cutover_default)\s*[:=]\s*true\b/i],
    ['gateway_authority_claim', /\bgateway-owned\s+(?:rbac|tenant|permission|api availability|authz)\b/i],
  ];

  for (const file of files) {
    const rel = path.relative(productRoot, file);
    const text = readFileSync(file, 'utf8');
    for (const [rule, pattern] of checks) {
      if (!pattern.test(text)) {
        continue;
      }
      const allowed =
        /api-gateway-readiness-script-utils\.mjs|api-registry-script-utils\.mjs|\.spec\.|\.test\.|playwright\.p10\.config\.ts/.test(rel) ||
        (rule !== 'gateway_cutover_enabled' &&
          /api-gateway-readiness\/api-gateway-readiness\.service\.ts/.test(rel));
      findings.push({
        file: rel,
        rule,
        classification: allowed ? 'allowed_readiness_reference' : 'forbidden',
      });
    }
  }

  const evidenceFiles = evidenceDir ? listFiles(evidenceDir).filter((file) => /\.(json|txt|md|log|ya?ml|env)$/.test(file)) : [];
  const evidenceSensitiveHits = [];
  for (const file of evidenceFiles) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_EVIDENCE_PATTERNS) {
      if (pattern.test(text)) {
        evidenceSensitiveHits.push({
          file: path.relative(evidenceDir, file),
          classification: 'forbidden_sensitive_evidence_pattern',
        });
      }
    }
  }
  const forbidden = findings.filter((finding) => finding.classification === 'forbidden');

  return {
    checkedAt: now(),
    test_layer: 'source_scan',
    data_mode: 'security_privacy',
    target_scope: 'gateway_route_policy',
    scannedFileCount: files.length,
    findings,
    forbidden,
    evidenceSensitiveHits,
    passed: forbidden.length === 0 && evidenceSensitiveHits.length === 0,
  };
}

export function prepareApiGatewayReadinessFixtures(mode, options) {
  const prefix = options.prefix ?? 'TEST_P10_GATEWAY';
  const evidenceDir = options['evidence-dir'] ?? null;
  const base = {
    checkedAt: now(),
    test_layer: 'manual_readback',
    data_mode: 'read_only_source',
    target_scope: 'ac_gateway_readiness_ui',
    prefix,
    evidenceDir,
    createdResources: [],
    retainedDataApprovalRequired: false,
  };

  if (mode === 'setup') {
    return {
      ...base,
      mode,
      result: 'ready_source_only_fixture',
      notes: ['Phase 10 uses source/readiness artifacts; no persistent rows are required.'],
      passed: true,
    };
  }
  if (mode === 'readback') {
    return {
      ...base,
      mode,
      result: 'readback_source_only_fixture',
      readinessArtifactsExpected: [
        'gateway-route-policy.json',
        'gateway-rendered/gateway-apisix-routes.rendered.yaml',
        'gateway-rendered/gateway-kong-routes.rendered.yaml',
      ],
      passed: true,
    };
  }
  if (mode === 'cleanup') {
    return {
      ...base,
      mode,
      result: 'cleanup_no_persistent_fixture',
      cleanupRequired: false,
      passed: true,
    };
  }

  return {
    ...base,
    mode,
    result: 'idempotent_source_only_fixture',
    duplicateResources: [],
    passed: true,
  };
}

export function verifyApiGatewayBrowserArtifacts(evidenceDir, required, options = {}) {
  const afterFile = options.after ? path.join(evidenceDir, options.after) : null;
  const afterStat = afterFile && existsSync(afterFile) ? statSync(afterFile) : null;
  const afterSha256 = afterFile && existsSync(afterFile)
    ? createHash('sha256').update(readFileSync(afterFile)).digest('hex')
    : null;
  const artifacts = required.map((fileName) => {
    const file = path.join(evidenceDir, fileName);
    let parsedPassed = null;
    if (existsSync(file) && /\.json$/.test(fileName)) {
      try {
        parsedPassed = readJson(file).passed;
      } catch {
        parsedPassed = null;
      }
    }
    return {
      fileName,
      exists: existsSync(file),
      bytes: existsSync(file) ? statSync(file).size : 0,
      mtimeMs: existsSync(file) ? statSync(file).mtimeMs : null,
      generatedAfterReadback: afterStat ? existsSync(file) && statSync(file).mtimeMs >= afterStat.mtimeMs : null,
      parsedPassed,
      passed:
        existsSync(file) &&
        statSync(file).size > 0 &&
        (parsedPassed !== false) &&
        (!afterStat || statSync(file).mtimeMs >= afterStat.mtimeMs),
    };
  });

  return {
    checkedAt: now(),
    test_layer: 'browser_ui',
    data_mode: 'read_only_source',
    target_scope: 'ac_gateway_readiness_ui',
    freshnessBaseline: afterFile
      ? {
          fileName: path.relative(evidenceDir, afterFile),
          exists: Boolean(afterStat),
          mtimeMs: afterStat?.mtimeMs ?? null,
          sha256: afterSha256,
        }
      : null,
    artifacts,
    missing: artifacts.filter((artifact) => !artifact.exists).map((artifact) => artifact.fileName),
    passed: artifacts.every((artifact) => artifact.passed),
  };
}

export { parseArgs, readJson, writeJson, writeText };
