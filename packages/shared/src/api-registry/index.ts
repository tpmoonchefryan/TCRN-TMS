// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  CAPABILITY_DEFINITIONS,
  MODULE_DEFINITIONS,
  type CapabilityDefinition,
  type ModuleDefinition,
} from '../module-capability';
import {
  RBAC_RESOURCE_MAP,
  type PermissionActionInput,
  type RbacResourceCode,
  resolveRbacPermission,
} from '../rbac/catalog';

export const API_REGISTRY_VERSION = '2026-05-31.phase-9' as const;

export const API_REGISTRY_DOCUMENT_GROUPS = ['operations', 'config', 'public'] as const;
export type ApiRegistryDocumentGroup = (typeof API_REGISTRY_DOCUMENT_GROUPS)[number];

export const API_OPERATION_AUTH_MODES = ['public', 'bearer_jwt', 'basic_docs_only'] as const;
export type ApiOperationAuthMode = (typeof API_OPERATION_AUTH_MODES)[number];

export const API_OPERATION_SCOPE_TYPES = [
  'public',
  'tenant',
  'subsidiary',
  'talent',
  'ac_platform',
] as const;
export type ApiOperationScopeType = (typeof API_OPERATION_SCOPE_TYPES)[number];

export const API_OPERATION_EXPOSURES = ['public', 'tenant_private', 'internal', 'ac_only'] as const;
export type ApiOperationExposure = (typeof API_OPERATION_EXPOSURES)[number];

export const API_OPERATION_STABILITIES = ['stable', 'preview', 'deprecated'] as const;
export type ApiOperationStability = (typeof API_OPERATION_STABILITIES)[number];

export const API_OPERATION_PII_CLASSES = [
  'none',
  'reference',
  'customer_pii',
  'secret_reference',
] as const;
export type ApiOperationPiiClass = (typeof API_OPERATION_PII_CLASSES)[number];

export interface ApiOperationPermissionRequirement {
  resource: RbacResourceCode;
  action: PermissionActionInput;
}

export interface ApiOperationDeprecation {
  isDeprecated: boolean;
  reason: string | null;
  replacementOperationCode: string | null;
  sunsetAt: string | null;
}

export interface ApiOperationDynamicPermissionResolver {
  enabled: boolean;
  resolverName: string | null;
  source: string | null;
  runtimeProofRequired: boolean;
}

export interface ApiOperationMetadataAuthority {
  kind:
    | 'tcrn_api_operation_decorator'
    | 'tcrn_api_registry_authority_snapshot'
    | 'tcrn_api_registry_source_snapshot'
    | 'missing';
  source: string;
  operationKey: string;
}

export interface ApiOperationDefinition {
  operationCode: string;
  method: string;
  pathTemplate: string;
  documentGroup: ApiRegistryDocumentGroup;
  tag: string;
  summary: string;
  description: string | null;
  ownerModuleCode: ModuleDefinition['code'];
  ownerCapabilityCode: CapabilityDefinition['code'];
  controllerName: string;
  handlerName: string;
  requestSchemaRef: string | null;
  responseSchemaRefs: readonly string[];
  authMode: ApiOperationAuthMode;
  requiredPermissions: readonly ApiOperationPermissionRequirement[];
  dynamicPermissionResolver: ApiOperationDynamicPermissionResolver;
  scopeType: ApiOperationScopeType;
  scopeSource: string;
  exposure: ApiOperationExposure;
  stability: ApiOperationStability;
  deprecation: ApiOperationDeprecation;
  piiClass: ApiOperationPiiClass;
  examplePolicy: 'no_raw_secret_or_pii' | 'public_safe_examples_only';
  gatewayEligible: boolean;
  builderExportEligible: boolean;
  auditEventTypes: readonly string[];
  metadataAuthority: ApiOperationMetadataAuthority;
  source: {
    openapiFile: string;
    operationId: string | null;
    controllerFile: string | null;
    controllerLine: number | null;
  };
}

export interface ApiRegistryDocument {
  registryVersion: typeof API_REGISTRY_VERSION;
  generatedAt: string;
  sourceCommit: string;
  operations: readonly ApiOperationDefinition[];
  groups: Record<
    ApiRegistryDocumentGroup,
    {
      title: string;
      operationCount: number;
      pathCount: number;
      schemaCount: number;
    }
  >;
  moduleLinks: Record<string, { operationCount: number; documentationGroup: string }>;
  capabilityLinks: Record<string, { operationCount: number; moduleCode: string }>;
  rbacLinks: Record<string, { actions: readonly string[]; operationCount: number }>;
  schemaLinks: Record<string, { operationCount: number }>;
  warnings: readonly string[];
}

export interface ApiRegistryDriftReport {
  checkedAt: string;
  sourceCommit: string;
  missingRegistry: readonly string[];
  missingController: readonly string[];
  missingSwagger: readonly string[];
  permissionMismatch: readonly string[];
  scopeMismatch: readonly string[];
  schemaMismatch: readonly string[];
  groupMismatch: readonly string[];
  exposureMismatch: readonly string[];
  authMismatch: readonly string[];
  metadataAuthorityMismatch: readonly string[];
  unclassifiedDynamicPermission: readonly string[];
  manualOpenApiArtifacts: readonly string[];
  excludedControllers: readonly { file: string; className: string; reason: string }[];
  result: 'pass' | 'fail';
}

export interface SwaggerExposurePolicy {
  environment: 'local' | 'test' | 'shared_dev' | 'staging' | 'production';
  enabled: boolean;
  authRequirement: 'none_local_only' | 'basic_auth_required' | 'disabled';
  tryOutMode: 'local_enabled' | 'read_only_or_disabled_for_private_mutations';
  allowedGroups: readonly ApiRegistryDocumentGroup[];
  publicGroupPolicy: 'public_safe_only';
  privateGroupPolicy: 'auth_required';
  acOnlySchemaPolicy: 'never_public';
  redactionPolicy: 'no_raw_secret_or_pii_examples';
  basicAuthFallback: 'production_supported';
  ssoFutureHook: 'reserved_not_active';
  persistAuthorizationPolicy: 'local_only' | 'disabled';
  oauthHelperPolicy: 'metadata_only_no_secret';
  browserStorageCleanupPolicy: 'clear_after_shared_or_prod_like_proof';
  evidenceTokenPolicy: 'forbid_tokens_cookies_auth_headers';
}

export interface GatewayRouteManifest {
  manifestVersion: typeof API_REGISTRY_VERSION;
  generatedFromRegistryVersion: typeof API_REGISTRY_VERSION;
  routes: readonly {
    operationCode: string;
    method: string;
    pathTemplate: string;
    upstreamService: 'tcrn-api';
    authPolicyRefs: readonly string[];
    rateLimitHints: readonly string[];
    oidcHints: readonly string[];
    canaryEligible: boolean;
    rollbackNotes: string;
    notAppliedReason: 'phase_9_readiness_only';
  }[];
  policyViolations?: readonly string[];
  passed?: boolean;
}

export interface BuilderApiReadonlyExport {
  exportVersion: typeof API_REGISTRY_VERSION;
  generatedFromRegistryVersion: typeof API_REGISTRY_VERSION;
  mode: 'read_only';
  operationCount: number;
  excludedOperationCount: number;
  operations: readonly Pick<
    ApiOperationDefinition,
    | 'operationCode'
    | 'method'
    | 'pathTemplate'
    | 'documentGroup'
    | 'ownerModuleCode'
    | 'ownerCapabilityCode'
    | 'requiredPermissions'
    | 'scopeType'
    | 'exposure'
    | 'stability'
    | 'requestSchemaRef'
    | 'responseSchemaRefs'
  >[];
  excludedOperations: readonly {
    operationCode: string;
    method: string;
    pathTemplate: string;
    reason: string;
  }[];
  sourceReadbackHash: string;
  warnings: readonly string[];
  passed: boolean;
}

export function validateApiOperationDefinition(operation: ApiOperationDefinition): string[] {
  const errors: string[] = [];

  if (!operation.operationCode.trim()) {
    errors.push('operationCode is required');
  }

  if (!/^[a-z][a-z0-9_.-]+$/.test(operation.operationCode)) {
    errors.push(`operationCode has invalid format: ${operation.operationCode}`);
  }

  if (!API_REGISTRY_DOCUMENT_GROUPS.includes(operation.documentGroup)) {
    errors.push(`unknown documentGroup: ${operation.documentGroup}`);
  }

  if (!API_OPERATION_AUTH_MODES.includes(operation.authMode)) {
    errors.push(`unknown authMode: ${operation.authMode}`);
  }

  if (!API_OPERATION_SCOPE_TYPES.includes(operation.scopeType)) {
    errors.push(`unknown scopeType: ${operation.scopeType}`);
  }

  if (!API_OPERATION_EXPOSURES.includes(operation.exposure)) {
    errors.push(`unknown exposure: ${operation.exposure}`);
  }

  if (!API_OPERATION_STABILITIES.includes(operation.stability)) {
    errors.push(`unknown stability: ${operation.stability}`);
  }

  if (!API_OPERATION_PII_CLASSES.includes(operation.piiClass)) {
    errors.push(`unknown piiClass: ${operation.piiClass}`);
  }

  if (!MODULE_DEFINITIONS.some((module) => module.code === operation.ownerModuleCode)) {
    errors.push(`unknown ownerModuleCode: ${operation.ownerModuleCode}`);
  }

  if (
    !CAPABILITY_DEFINITIONS.some((capability) => capability.code === operation.ownerCapabilityCode)
  ) {
    errors.push(`unknown ownerCapabilityCode: ${operation.ownerCapabilityCode}`);
  }

  const capability = CAPABILITY_DEFINITIONS.find(
    (candidate) => candidate.code === operation.ownerCapabilityCode
  );

  if (capability && capability.moduleCode !== operation.ownerModuleCode) {
    errors.push(
      `ownerCapabilityCode ${operation.ownerCapabilityCode} belongs to ${capability.moduleCode}, not ${operation.ownerModuleCode}`
    );
  }

  for (const permission of operation.requiredPermissions) {
    if (!RBAC_RESOURCE_MAP.has(permission.resource)) {
      errors.push(`unknown RBAC resource: ${permission.resource}`);
      continue;
    }

    try {
      resolveRbacPermission(permission.resource, permission.action);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `invalid permission ${permission.resource}`
      );
    }
  }

  if (
    operation.dynamicPermissionResolver.enabled &&
    (!operation.dynamicPermissionResolver.resolverName ||
      !operation.dynamicPermissionResolver.source ||
      !operation.dynamicPermissionResolver.runtimeProofRequired)
  ) {
    errors.push(
      `dynamic permission operation ${operation.operationCode} lacks resolver proof metadata`
    );
  }

  if (operation.deprecation.isDeprecated && operation.stability !== 'deprecated') {
    errors.push(`deprecated operation ${operation.operationCode} must use deprecated stability`);
  }

  if (
    !operation.metadataAuthority ||
    operation.metadataAuthority.kind === 'missing' ||
    !operation.metadataAuthority.source ||
    !operation.metadataAuthority.operationKey
  ) {
    errors.push(`operation ${operation.operationCode} lacks explicit metadata authority`);
  }

  return errors;
}

export function validateApiRegistryDocument(document: ApiRegistryDocument): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const operation of document.operations) {
    if (seen.has(operation.operationCode)) {
      errors.push(`duplicate operationCode: ${operation.operationCode}`);
    }
    seen.add(operation.operationCode);
    errors.push(...validateApiOperationDefinition(operation));
  }

  return errors;
}
