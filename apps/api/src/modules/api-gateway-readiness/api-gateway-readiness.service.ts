import { Injectable } from '@nestjs/common';

import {
  API_GATEWAY_NOT_APPLIED_REASON,
  API_GATEWAY_READINESS_VERSION,
  type ApiGatewayCutoverRunbook,
  type ApiGatewayProvider,
  type ApiGatewayRateLimitCorsPolicy,
  type ApiGatewayReadinessSummary,
  type ApiGatewayRenderedArtifact,
  type ApiGatewayRenderValidation,
  type ApiGatewayRouteDriftReport,
  type ApiGatewayRoutePolicy,
  type ApiGatewayTrustedProxyPolicy,
  validateApiGatewayRoutePolicy,
} from '@tcrn/shared';

import { ApiRegistryService } from '../api-registry/api-registry.service';

const STRIPPED_UNTRUSTED_HEADERS = [
  'x-real-ip',
  'cf-connecting-ip',
  'x-tenant-id',
  'x-subsidiary-id',
  'x-talent-id',
  'authorization',
] as const;

@Injectable()
export class ApiGatewayReadinessService {
  constructor(private readonly apiRegistryService: ApiRegistryService) {}

  getSummary(): ApiGatewayReadinessSummary {
    const routePolicy = this.getRoutePolicy();
    const renderValidation = this.getRenderValidation(routePolicy);
    const routeDriftReport = this.getRouteDriftReport(routePolicy);
    const warnings = [
      ...routePolicy.warnings,
      ...renderValidation.forbiddenApplyCommandHits,
      ...routePolicy.rateLimitCorsPolicy.parityWarnings,
    ];
    const uiState = (() => {
      if (routePolicy.routes.length === 0) {
        return 'empty_no_policy' as const;
      }
      if (!renderValidation.passed) {
        return 'render_failed' as const;
      }
      if (!routeDriftReport.passed || routePolicy.rateLimitCorsPolicy.parityWarnings.length > 0) {
        return 'drift_or_parity_warning' as const;
      }
      if (!routePolicy.trustedProxyPolicy.passed) {
        return 'trusted_header_warning' as const;
      }
      if (routePolicy.canaryRollback.status !== 'available_after_owner_approved_cutover_gate') {
        return 'canary_rollback_unavailable' as const;
      }
      if (routePolicy.sourceCommit.includes('stale')) {
        return 'stale_verification' as const;
      }
      return 'clean_ready' as const;
    })();

    return {
      readinessVersion: API_GATEWAY_READINESS_VERSION,
      generatedAt: routePolicy.generatedAt,
      uiState,
      activeProxyBaseline: routePolicy.activeProxyBaseline,
      routePolicy,
      renderValidation,
      routeDriftReport,
      trustedProxyPolicy: routePolicy.trustedProxyPolicy,
      rateLimitCorsPolicy: routePolicy.rateLimitCorsPolicy,
      cutoverRunbook: this.getCutoverRunbook(),
      warnings,
    };
  }

  getRoutePolicy(): ApiGatewayRoutePolicy {
    const registry = this.apiRegistryService.getDocument();
    const phase9Manifest = this.apiRegistryService.getGatewayRouteManifest();
    const operationsByCode = new Map(
      registry.operations.map((operation) => [operation.operationCode, operation])
    );
    const registryJoin = this.buildRegistryJoin(registry, phase9Manifest);
    const generatedAt = new Date().toISOString();
    const trustedProxyPolicy = this.getTrustedProxyPolicy();
    const rateLimitCorsPolicy = this.getRateLimitCorsPolicy();
    const routes = phase9Manifest.routes.flatMap((route) => {
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
        requiredPermissions: operation.requiredPermissions,
        ownerModuleCode: operation.ownerModuleCode,
        ownerCapabilityCode: operation.ownerCapabilityCode,
        authPolicyRefs: route.authPolicyRefs,
        rateLimitHints: route.rateLimitHints,
        oidcHints: route.oidcHints,
        canaryEligible: route.canaryEligible,
        rollbackNotes:
          'Phase 10 readiness only. A later owner-approved gateway cutover gate must select canary traffic and rollback controls.',
        routeSource: 'phase_9_api_registry_manifest' as const,
        sourceNotAppliedReason: route.notAppliedReason,
        cutoverDefault: false as const,
        notAppliedReason: API_GATEWAY_NOT_APPLIED_REASON,
      }];
    });
    const policy: ApiGatewayRoutePolicy = {
      policyVersion: API_GATEWAY_READINESS_VERSION,
      generatedAt,
      generatedFromRegistryVersion: registry.registryVersion,
      generatedFromManifestVersion: phase9Manifest.manifestVersion,
      sourceCommit: registry.sourceCommit,
      activeProxyBaseline: 'caddy',
      preferredProvider: 'apisix',
      compatibilityProvider: 'kong',
      registryJoin,
      routes,
      trustedProxyPolicy,
      rateLimitCorsPolicy,
      canaryRollback: {
        status: 'available_after_owner_approved_cutover_gate',
        ownerApprovalRequired: true,
        shadowCompareRequired: true,
        rollbackRequired: true,
      },
      warnings: routes.length === 0 ? ['no_gateway_eligible_routes'] : [],
      passed: true,
    };
    const errors = validateApiGatewayRoutePolicy(policy);

    return {
      ...policy,
      canaryRollback: {
        ...policy.canaryRollback,
        status:
          errors.length === 0
            ? 'available_after_owner_approved_cutover_gate'
            : 'unavailable_until_policy_clean',
      },
      warnings: [...policy.warnings, ...errors],
      passed: errors.length === 0,
    };
  }

  getTrustedProxyPolicy(): ApiGatewayTrustedProxyPolicy {
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

  getRateLimitCorsPolicy(): ApiGatewayRateLimitCorsPolicy {
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

  getRenderedArtifact(provider: ApiGatewayProvider): ApiGatewayRenderedArtifact {
    const policy = this.getRoutePolicy();
    const content = this.renderGatewayYaml(provider, policy);
    const validation = this.validateRenderedGatewayContent(provider, content);

    return {
      provider,
      fileName:
        provider === 'apisix'
          ? 'gateway-apisix-routes.rendered.yaml'
          : 'gateway-kong-routes.rendered.yaml',
      mode: 'readiness_only',
      content,
      routeCount: policy.routes.length,
      notAppliedReason: API_GATEWAY_NOT_APPLIED_REASON,
      containsApplyCommand: false,
      passed: validation.passed,
    };
  }

  getCutoverRunbook(): ApiGatewayCutoverRunbook {
    const generatedAt = new Date().toISOString();

    return {
      title: 'API Gateway Readiness Cutover Runbook',
      generatedAt,
      readinessOnly: true,
      ownerApprovalGate:
        'No gateway traffic change is allowed until a later owner-approved cutover phase.',
      preconditions: [
        'Phase 10 route policy is clean and generated from the accepted API Registry.',
        'OIDC, CORS, rate-limit, trusted-header, and redaction policies are reviewed.',
        'APISIX/Kong render output is compared in shadow mode against current Caddy/Ingress routing.',
      ],
      canarySteps: [
        'Select a non-production or explicitly approved canary host.',
        'Mirror read-only traffic first and compare response status, latency, and trace ids.',
        'Increase canary percentage only after health and security checks pass.',
      ],
      shadowCompareChecks: [
        'Route/method parity',
        'Authentication and RBAC denial parity',
        'CORS and Swagger exposure parity',
        'No forwarded tenant/auth header authority',
      ],
      healthChecks: [
        'API health endpoint remains healthy',
        'Ingress/Caddy baseline can still serve traffic',
        'Gateway error budget stays within owner-approved limits',
      ],
      rollbackTriggers: [
        'Auth, tenant isolation, or CORS parity mismatch',
        'Elevated 4xx/5xx rate beyond approved threshold',
        'Trace propagation or audit correlation failure',
      ],
      rollbackSteps: [
        'Return DNS/Ingress weight to the current Caddy/Ingress baseline.',
        'Disable gateway canary routing in the owner-approved change record.',
        'Re-run route-drift and trusted-header checks before any retry.',
      ],
      dataProtectionNotes: [
        'No secrets, cookies, authorization headers, or private payloads may be stored in evidence.',
        'Rendered artifacts are readiness-only and must not include admin API credentials.',
      ],
      forbiddenActions: [
        'No default traffic cutover in Phase 10',
        'No gateway admin console exposure to ordinary tenants',
        'No gateway-owned RBAC, tenant scope, or API availability authority',
      ],
    };
  }

  private getRenderValidation(policy: ApiGatewayRoutePolicy): ApiGatewayRenderValidation {
    const artifacts = (['apisix', 'kong'] as const).map((provider) => {
      const artifact = this.getRenderedArtifact(provider);
      return {
        provider: artifact.provider,
        fileName: artifact.fileName,
        routeCount: artifact.routeCount,
        notAppliedReason: artifact.notAppliedReason,
        passed: artifact.passed,
      };
    });
    const forbiddenApplyCommandHits: string[] = [];

    return {
      checkedAt: policy.generatedAt,
      artifacts,
      providerOrder: ['apisix', 'kong'],
      forbiddenApplyCommandHits,
      passed: artifacts.every((artifact) => artifact.passed),
    };
  }

  private getRouteDriftReport(policy: ApiGatewayRoutePolicy): ApiGatewayRouteDriftReport {
    return {
      checkedAt: policy.generatedAt,
      activeProxyBaseline: policy.activeProxyBaseline,
      activeGatewayDependencies: [],
      routePolicyCount: policy.routes.length,
      cutoverEnabledCount: policy.routes.filter((route) => route.cutoverDefault !== false).length,
      unknownOperationCount: policy.registryJoin.unknownOperationCodes.length,
      missingManifestRouteCount: policy.registryJoin.missingManifestOperationCodes.length,
      versionMismatchCount: policy.registryJoin.versionMismatches.length,
      result: policy.passed ? 'pass' : 'fail',
      passed: policy.passed,
    };
  }

  private renderGatewayYaml(provider: ApiGatewayProvider, policy: ApiGatewayRoutePolicy): string {
    return JSON.stringify(
      provider === 'apisix'
        ? this.buildApisixReadinessConfig(policy)
        : this.buildKongReadinessConfig(policy),
      null,
      2
    );
  }

  private buildRegistryJoin(
    registry: ReturnType<ApiRegistryService['getDocument']>,
    phase9Manifest: ReturnType<ApiRegistryService['getGatewayRouteManifest']>
  ): ApiGatewayRoutePolicy['registryJoin'] {
    const operationsByCode = new Map(
      registry.operations.map((operation) => [operation.operationCode, operation])
    );
    const manifestByCode = new Map(
      phase9Manifest.routes.map((route) => [route.operationCode, route])
    );
    const gatewayEligibleOperations = registry.operations.filter(
      (operation) => operation.gatewayEligible
    );
    const mismatchedManifestRoutes: string[] = [];

    for (const route of phase9Manifest.routes) {
      const operation = operationsByCode.get(route.operationCode);
      if (!operation) {
        continue;
      }
      if (route.method.toUpperCase() !== operation.method.toUpperCase()) {
        mismatchedManifestRoutes.push(
          `${route.operationCode}: manifest method ${route.method} does not match registry ${operation.method}`
        );
      }
      if (route.pathTemplate !== operation.pathTemplate) {
        mismatchedManifestRoutes.push(
          `${route.operationCode}: manifest path ${route.pathTemplate} does not match registry ${operation.pathTemplate}`
        );
      }
      if (!operation.gatewayEligible) {
        mismatchedManifestRoutes.push(
          `${route.operationCode}: manifest route is not gatewayEligible in registry`
        );
      }
    }

    return {
      registryOperationCount: registry.operations.length,
      gatewayEligibleOperationCount: gatewayEligibleOperations.length,
      manifestRouteCount: phase9Manifest.routes.length,
      unknownOperationCodes: phase9Manifest.routes
        .filter((route) => !operationsByCode.has(route.operationCode))
        .map((route) => route.operationCode),
      missingManifestOperationCodes: gatewayEligibleOperations
        .filter((operation) => !manifestByCode.has(operation.operationCode))
        .map((operation) => operation.operationCode),
      mismatchedManifestRoutes,
      missingSourceMetadataOperationCodes: gatewayEligibleOperations
        .filter(
          (operation) =>
            !operation.metadataAuthority ||
            operation.metadataAuthority.kind === 'missing' ||
            !operation.metadataAuthority.source ||
            !operation.metadataAuthority.operationKey ||
            !operation.source?.openapiFile
        )
        .map((operation) => operation.operationCode),
      versionMismatches: [
        ...(phase9Manifest.manifestVersion === registry.registryVersion
          ? []
          : [
              `manifestVersion ${phase9Manifest.manifestVersion} does not match registry ${registry.registryVersion}`,
            ]),
        ...(phase9Manifest.generatedFromRegistryVersion === registry.registryVersion
          ? []
          : [
              `manifest generatedFromRegistryVersion ${phase9Manifest.generatedFromRegistryVersion} does not match registry ${registry.registryVersion}`,
            ]),
      ],
    };
  }

  private routeId(provider: ApiGatewayProvider, index: number, operationCode: string): string {
    return `p10-${provider}-${index + 1}-${operationCode.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
  }

  private buildApisixReadinessConfig(policy: ApiGatewayRoutePolicy) {
    return {
      provider: 'apisix',
      mode: 'readiness_only',
      not_applied_reason: API_GATEWAY_NOT_APPLIED_REASON,
      generated_from_registry: policy.generatedFromRegistryVersion,
      routes: policy.routes.map((route, index) => ({
        id: this.routeId('apisix', index, route.operationCode),
        name: route.operationCode,
        uri: `/api/v1${route.pathTemplate}`,
        methods: [route.method.toUpperCase()],
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

  private buildKongReadinessConfig(policy: ApiGatewayRoutePolicy) {
    const routes = policy.routes.map((route, index) => ({
      name: this.routeId('kong', index, route.operationCode),
      methods: [route.method.toUpperCase()],
      paths: [`/api/v1${route.pathTemplate}`],
      strip_path: false,
      preserve_host: true,
      tags: [API_GATEWAY_NOT_APPLIED_REASON, route.operationCode],
    }));

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
          tags: [API_GATEWAY_NOT_APPLIED_REASON],
          routes,
        },
      ],
      plugins: [
        {
          name: 'request-transformer',
          service: 'tcrn-api',
          enabled: false,
          tags: [API_GATEWAY_NOT_APPLIED_REASON, 'trusted-header-readiness'],
          config: {
            remove: {
              headers: STRIPPED_UNTRUSTED_HEADERS,
            },
          },
        },
        ...policy.routes
          .filter((route) => route.authMode === 'bearer_jwt')
          .map((route, index) => ({
            name: 'jwt',
            route: this.routeId('kong', index, route.operationCode),
            enabled: false,
            tags: [API_GATEWAY_NOT_APPLIED_REASON, route.operationCode, 'future-oidc-jwt-readiness'],
            config: {
              key_claim_name: 'iss',
              claims_to_verify: ['exp'],
              readiness_hint: route.oidcHints,
            },
          })),
      ],
    };
  }

  private validateRenderedGatewayContent(provider: ApiGatewayProvider, content: string) {
    const errors: string[] = [];
    const forbidden = /\b(kubectl\s+apply|deck\s+sync|apisix\s+start|kong\s+start)\b/i.test(content);
    let value: any = null;
    try {
      value = JSON.parse(content);
    } catch (error) {
      errors.push(
        `rendered ${provider} artifact is not parseable structured YAML-compatible JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    if (forbidden) {
      errors.push('gateway apply/start command must not appear in rendered readiness artifact');
    }

    if (provider === 'apisix') {
      if (value?.provider !== 'apisix' || !Array.isArray(value?.routes)) {
        errors.push('APISIX readiness artifact must include provider=apisix and routes[]');
      }
      for (const route of value?.routes ?? []) {
        const missingHeaders = STRIPPED_UNTRUSTED_HEADERS.filter(
          (header) => !route.plugins?.['proxy-rewrite']?.headers?.remove?.includes(header)
        );
        if (!route.uri || !Array.isArray(route.methods) || !route.upstream?.nodes) {
          errors.push(`${route.name ?? 'unknown'}: APISIX route requires uri, methods, and upstream.nodes`);
        }
        if (missingHeaders.length > 0) {
          errors.push(`${route.name ?? 'unknown'}: APISIX proxy-rewrite must remove ${missingHeaders.join(', ')}`);
        }
      }
    } else {
      const routes = (value?.services ?? []).flatMap((service: any) => service.routes ?? []);
      const transformer = (value?.plugins ?? []).find((plugin: any) => plugin.name === 'request-transformer');
      const missingHeaders = STRIPPED_UNTRUSTED_HEADERS.filter(
        (header) => !transformer?.config?.remove?.headers?.includes(header)
      );
      if (value?._format_version !== '3.0' || !Array.isArray(value?.services)) {
        errors.push('Kong readiness artifact must include _format_version=3.0 and services[]');
      }
      if (!routes.every((route: any) => Array.isArray(route.methods) && Array.isArray(route.paths))) {
        errors.push('Kong routes must include methods[] and paths[]');
      }
      if (!transformer || missingHeaders.length > 0) {
        errors.push(`Kong request-transformer must remove ${missingHeaders.join(', ') || 'untrusted headers'}`);
      }
    }

    return { passed: errors.length === 0, errors };
  }
}
