import type { ApiRegistryDocument, GatewayRouteManifest } from '../api-registry';

export const API_GATEWAY_READINESS_VERSION = '2026-05-31.phase-10' as const;
export const API_GATEWAY_NOT_APPLIED_REASON = 'phase_10_readiness_only' as const;

export type ApiGatewayProvider = 'apisix' | 'kong';
export type ApiGatewayActiveProxyBaseline = 'caddy' | 'k8s-ingress';
export type ApiGatewayReadinessUiState =
  | 'loading'
  | 'clean_ready'
  | 'empty_no_policy'
  | 'render_failed'
  | 'drift_or_parity_warning'
  | 'trusted_header_warning'
  | 'canary_rollback_unavailable'
  | 'permission_denied'
  | 'api_error_retry'
  | 'stale_verification';

export interface ApiGatewayTrustedProxyPolicy {
  policyVersion: typeof API_GATEWAY_READINESS_VERSION;
  trustedCidrs: readonly string[];
  trustedHeaderNames: readonly string[];
  strippedUntrustedHeaderNames: readonly string[];
  tenantAuthorityHeaderPolicy: 'ignore_forwarded_tenant_headers';
  authHeaderPolicy: 'application_jwt_only';
  tracePropagation: 'preserve_traceparent_generate_if_missing';
  spoofingDeniedCases: readonly string[];
  passed: boolean;
}

export interface ApiGatewayRateLimitCorsPolicy {
  policyVersion: typeof API_GATEWAY_READINESS_VERSION;
  corsAuthority: 'tcrn_application_config';
  rateLimitAuthority: 'tcrn_application_middleware';
  swaggerExposureAuthority: 'tcrn_swagger_exposure_policy';
  routeHints: readonly {
    hint: string;
    owner: 'application';
    gatewayMode: 'mirror_only';
  }[];
  corsHints: readonly string[];
  securityHeaderHints: readonly string[];
  parityWarnings: readonly string[];
  passed: boolean;
}

export interface ApiGatewayRoutePolicyRoute {
  operationCode: string;
  method: string;
  pathTemplate: string;
  upstreamService: 'tcrn-api';
  exposure: ApiRegistryDocument['operations'][number]['exposure'];
  scopeType: ApiRegistryDocument['operations'][number]['scopeType'];
  authMode: ApiRegistryDocument['operations'][number]['authMode'];
  requiredPermissions: ApiRegistryDocument['operations'][number]['requiredPermissions'];
  ownerModuleCode: string;
  ownerCapabilityCode: string;
  authPolicyRefs: readonly string[];
  rateLimitHints: readonly string[];
  oidcHints: readonly string[];
  canaryEligible: boolean;
  rollbackNotes: string;
  routeSource: 'phase_9_api_registry_manifest';
  sourceNotAppliedReason: GatewayRouteManifest['routes'][number]['notAppliedReason'];
  cutoverDefault: false;
  notAppliedReason: typeof API_GATEWAY_NOT_APPLIED_REASON;
}

export interface ApiGatewayRoutePolicy {
  policyVersion: typeof API_GATEWAY_READINESS_VERSION;
  generatedAt: string;
  generatedFromRegistryVersion: ApiRegistryDocument['registryVersion'];
  generatedFromManifestVersion: GatewayRouteManifest['manifestVersion'];
  sourceCommit: string;
  activeProxyBaseline: ApiGatewayActiveProxyBaseline;
  preferredProvider: 'apisix';
  compatibilityProvider: 'kong';
  registryJoin: {
    registryOperationCount: number;
    gatewayEligibleOperationCount: number;
    manifestRouteCount: number;
    unknownOperationCodes: readonly string[];
    missingManifestOperationCodes: readonly string[];
    mismatchedManifestRoutes: readonly string[];
    missingSourceMetadataOperationCodes: readonly string[];
    versionMismatches: readonly string[];
  };
  routes: readonly ApiGatewayRoutePolicyRoute[];
  trustedProxyPolicy: ApiGatewayTrustedProxyPolicy;
  rateLimitCorsPolicy: ApiGatewayRateLimitCorsPolicy;
  canaryRollback: {
    status: 'available_after_owner_approved_cutover_gate' | 'unavailable_until_policy_clean';
    ownerApprovalRequired: true;
    shadowCompareRequired: true;
    rollbackRequired: true;
  };
  warnings: readonly string[];
  passed: boolean;
}

export interface ApiGatewayRenderedArtifact {
  provider: ApiGatewayProvider;
  fileName: string;
  mode: 'readiness_only';
  content: string;
  routeCount: number;
  notAppliedReason: typeof API_GATEWAY_NOT_APPLIED_REASON;
  containsApplyCommand: false;
  passed: boolean;
}

export interface ApiGatewayRenderValidation {
  checkedAt: string;
  artifacts: readonly Pick<
    ApiGatewayRenderedArtifact,
    'provider' | 'fileName' | 'routeCount' | 'notAppliedReason' | 'passed'
  >[];
  providerOrder: readonly ['apisix', 'kong'];
  forbiddenApplyCommandHits: readonly string[];
  passed: boolean;
}

export interface ApiGatewayRouteDriftReport {
  checkedAt: string;
  activeProxyBaseline: ApiGatewayActiveProxyBaseline;
  activeGatewayDependencies: readonly string[];
  routePolicyCount: number;
  cutoverEnabledCount: number;
  unknownOperationCount: number;
  missingManifestRouteCount: number;
  versionMismatchCount: number;
  result: 'pass' | 'fail';
  passed: boolean;
}

export interface ApiGatewayCutoverRunbook {
  title: string;
  generatedAt: string;
  readinessOnly: true;
  ownerApprovalGate: string;
  preconditions: readonly string[];
  canarySteps: readonly string[];
  shadowCompareChecks: readonly string[];
  healthChecks: readonly string[];
  rollbackTriggers: readonly string[];
  rollbackSteps: readonly string[];
  dataProtectionNotes: readonly string[];
  forbiddenActions: readonly string[];
}

export interface ApiGatewayReadinessSummary {
  readinessVersion: typeof API_GATEWAY_READINESS_VERSION;
  generatedAt: string;
  uiState: Exclude<ApiGatewayReadinessUiState, 'loading' | 'permission_denied' | 'api_error_retry'>;
  activeProxyBaseline: ApiGatewayActiveProxyBaseline;
  routePolicy: ApiGatewayRoutePolicy;
  renderValidation: ApiGatewayRenderValidation;
  routeDriftReport: ApiGatewayRouteDriftReport;
  trustedProxyPolicy: ApiGatewayTrustedProxyPolicy;
  rateLimitCorsPolicy: ApiGatewayRateLimitCorsPolicy;
  cutoverRunbook: ApiGatewayCutoverRunbook;
  warnings: readonly string[];
}

export function validateApiGatewayRoutePolicy(policy: ApiGatewayRoutePolicy): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const join = policy.registryJoin;

  if (join.unknownOperationCodes.length > 0) {
    errors.push(`unknown manifest operations: ${join.unknownOperationCodes.join(', ')}`);
  }

  if (join.missingManifestOperationCodes.length > 0) {
    errors.push(`missing manifest routes: ${join.missingManifestOperationCodes.join(', ')}`);
  }

  if (join.mismatchedManifestRoutes.length > 0) {
    errors.push(...join.mismatchedManifestRoutes);
  }

  if (join.missingSourceMetadataOperationCodes.length > 0) {
    errors.push(`missing registry source metadata: ${join.missingSourceMetadataOperationCodes.join(', ')}`);
  }

  if (join.versionMismatches.length > 0) {
    errors.push(...join.versionMismatches);
  }

  for (const route of policy.routes) {
    const key = `${route.method.toUpperCase()} ${route.pathTemplate}`;
    if (seen.has(key)) {
      errors.push(`duplicate route policy: ${key}`);
    }
    seen.add(key);

    if (route.cutoverDefault !== false) {
      errors.push(`${route.operationCode}: cutoverDefault must remain false`);
    }

    if (route.notAppliedReason !== API_GATEWAY_NOT_APPLIED_REASON) {
      errors.push(`${route.operationCode}: route must remain phase_10_readiness_only`);
    }

    if (!route.upstreamService) {
      errors.push(`${route.operationCode}: upstreamService is required`);
    }

    if (route.authPolicyRefs.length === 0) {
      errors.push(`${route.operationCode}: authPolicyRefs are required`);
    }

    if (route.rateLimitHints.length === 0) {
      errors.push(`${route.operationCode}: rateLimitHints are required`);
    }

    if (route.authMode === 'bearer_jwt' && route.oidcHints.length === 0) {
      errors.push(`${route.operationCode}: bearer_jwt routes require future OIDC/JWT readiness hints`);
    }
  }

  if (!policy.trustedProxyPolicy.passed) {
    errors.push('trusted proxy policy did not pass');
  }

  if (!policy.rateLimitCorsPolicy.passed) {
    errors.push('rate-limit/CORS policy did not pass');
  }

  return errors;
}
