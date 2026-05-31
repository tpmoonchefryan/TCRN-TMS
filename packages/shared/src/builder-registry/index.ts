import type {
  ApiOperationDefinition,
  ApiOperationScopeType,
  ApiRegistryDocument,
  ApiRegistryDocumentGroup,
  ApiOperationStability,
} from '../api-registry';
import type { CapabilityDefinition, ModuleDefinition } from '../module-capability';
import type { PermissionActionInput, RbacResourceCode } from '../rbac/catalog';

export const BUILDER_REGISTRY_VERSION = '2026-05-31.phase-11' as const;
export const BUILDER_REGISTRY_GENERATED_AT = '2026-05-31T00:00:00.000Z' as const;

export const BUILDER_REGISTRY_ARTIFACT_KINDS = [
  'manifest',
  'api-readonly-export',
  'schema-catalog',
  'types',
  'sdk-readonly',
  'openapi-readonly',
  'composed-dry-run',
] as const;

export type BuilderRegistryArtifactKind = (typeof BUILDER_REGISTRY_ARTIFACT_KINDS)[number];

export type BuilderRegistryStatus =
  | 'ready'
  | 'empty_no_manifest'
  | 'partial_metadata_warning'
  | 'drift_warning'
  | 'redaction_warning'
  | 'composition_unavailable'
  | 'permission_denied'
  | 'api_error_retry'
  | 'stale_verification';

export interface BuilderRegistryPermissionRequirement {
  resource: RbacResourceCode;
  action: PermissionActionInput;
}

export interface BuilderApiReadonlyOperation {
  operationCode: string;
  moduleCode: ModuleDefinition['code'];
  capabilityCode: CapabilityDefinition['code'];
  method: string;
  pathTemplate: string;
  documentGroup: ApiRegistryDocumentGroup;
  exposure: ApiOperationDefinition['exposure'];
  authMode: ApiOperationDefinition['authMode'];
  requiredPermissions: readonly BuilderRegistryPermissionRequirement[];
  dynamicPermissionResolver: ApiOperationDefinition['dynamicPermissionResolver'];
  scopeType: ApiOperationScopeType;
  stability: ApiOperationStability;
  deprecated: boolean;
  requestSchemaRef: string | null;
  responseSchemaRefs: readonly string[];
  builderEligible: true;
  exclusionReason: null;
  source: ApiOperationDefinition['source'];
}

export interface BuilderApiReadonlyExportV2 {
  exportVersion: typeof BUILDER_REGISTRY_VERSION;
  generatedFromRegistryVersion: ApiRegistryDocument['registryVersion'];
  mode: 'read_only';
  operationCount: number;
  excludedOperationCount: number;
  operations: readonly BuilderApiReadonlyOperation[];
  excludedOperations: readonly {
    operationCode: string;
    method: string;
    pathTemplate: string;
    reason: string;
  }[];
  sourceReadbackHash?: string;
  warnings: readonly string[];
  passed: boolean;
}

export interface BuilderModuleCapabilityManifest {
  manifestVersion: typeof BUILDER_REGISTRY_VERSION;
  sourceCommit: string;
  generatedAt: string;
  generatedFromRegistryVersion: ApiRegistryDocument['registryVersion'];
  modules: readonly {
    moduleCode: ModuleDefinition['code'];
    moduleName: string;
    stability: ModuleDefinition['stability'];
    scopeApplicability: readonly string[];
    capabilityCodes: readonly string[];
    operationCount: number;
    readOperationCount: number;
    sourceRegistryRefs: readonly string[];
  }[];
  capabilities: readonly {
    moduleCode: ModuleDefinition['code'];
    capabilityCode: CapabilityDefinition['code'];
    capabilityName: string;
    scopeApplicability: readonly string[];
    stability: CapabilityDefinition['status'];
    permissionSummary: readonly string[];
    operationCodes: readonly string[];
    artifactStatus: 'ready' | 'partial_metadata_warning' | 'empty_no_manifest';
    warningCodes: readonly string[];
  }[];
  dependencies: readonly {
    fromCapabilityCode: string;
    toCapabilityCode: string;
  }[];
  sourceReadbackHash?: string;
  warnings: readonly string[];
  passed: boolean;
}

export interface BuilderSchemaCatalog {
  schemaVersion: typeof BUILDER_REGISTRY_VERSION;
  schemaRefs: readonly {
    schemaRef: string;
    operationCodes: readonly string[];
    source: 'api_registry' | 'inline_openapi';
    piiClassification: 'none' | 'reference' | 'customer_pii' | 'secret_reference';
    examplePolicy: 'synthetic_placeholders_only';
  }[];
  redactionPolicy: 'no_raw_secret_or_pii_examples';
  typeRefs: readonly string[];
  unsupportedTypes: readonly string[];
  sourceFiles: readonly string[];
  warnings: readonly string[];
  passed: boolean;
}

export interface BuilderGeneratedArtifactStatus {
  artifactKind: BuilderRegistryArtifactKind;
  status: 'ready' | 'disabled';
  fileName: string;
  contentHash: string;
  disabledReason: string | null;
  redactionStatus: 'passed' | 'failed';
}

export interface BuilderComposedOperationDryRun {
  operationCode: 'builder.acCapabilitySurfaceOverview.read';
  mode: 'dry_run';
  nativeOperationRefs: readonly {
    ref: string;
    method: 'GET';
    pathTemplate: string;
    operationCode: string;
  }[];
  inputSchema: {
    locale: 'SupportedUiLocale';
    includeWarnings: 'boolean';
  };
  permissionRequirements: readonly BuilderRegistryPermissionRequirement[];
  scopeRequirements: readonly string[];
  dryRunPlan: readonly string[];
  redactedSampleOutput: {
    moduleCount: number;
    capabilityCount: number;
    operationCount: number;
    readOperationCount: number;
    rbacResourceGroupCount: number;
    warningCodes: readonly string[];
    artifactStatus: 'ready' | 'partial_metadata_warning' | 'composition_unavailable';
  };
  unsupportedReasons: readonly string[];
  passed: boolean;
}

export interface BuilderRegistrySummary {
  registryVersion: typeof BUILDER_REGISTRY_VERSION;
  status: BuilderRegistryStatus;
  generatedAt: string;
  sourceCommit: string;
  manifestVersion: typeof BUILDER_REGISTRY_VERSION;
  moduleCount: number;
  capabilityCount: number;
  operationCount: number;
  schemaCount: number;
  readOnlyArtifactStatus: 'ready' | 'partial_metadata_warning' | 'redaction_warning';
  composedDryRunStatus: 'ready' | 'composition_unavailable';
  artifactStatuses: readonly BuilderGeneratedArtifactStatus[];
  warnings: readonly string[];
}

export interface BuilderRegistryModuleRow {
  moduleCode: ModuleDefinition['code'];
  moduleName: string;
  capabilityCode: CapabilityDefinition['code'];
  capabilityName: string;
  scopeApplicability: readonly string[];
  operationCount: number;
  readOperationCount: number;
  operationCodes: readonly string[];
  excludedOperationCount: number;
  stability: ApiOperationStability | CapabilityDefinition['status'];
  permissionSummary: readonly string[];
  artifactStatus: 'ready' | 'partial_metadata_warning' | 'empty_no_manifest';
  lastVerifiedAt: string;
  warningCodes: readonly string[];
}

export interface BuilderRegistryModulesResponse {
  rows: readonly BuilderRegistryModuleRow[];
}

export interface BuilderRegistryOperationDetail extends BuilderApiReadonlyOperation {
  responseSchemaRef: string | null;
}

export interface BuilderRegistryArtifactDownload {
  artifactKind: BuilderRegistryArtifactKind;
  fileName: string;
  contentType: 'application/json' | 'text/plain' | 'application/typescript';
  contentHash: string;
  manifestVersion: typeof BUILDER_REGISTRY_VERSION;
  redactionStatus: 'passed';
  cacheControl: 'no-store, private';
  content: string;
}

export function isBuilderRegistryArtifactKind(
  value: string
): value is BuilderRegistryArtifactKind {
  return (BUILDER_REGISTRY_ARTIFACT_KINDS as readonly string[]).includes(value);
}

export function validateBuilderReadonlyExport(exportDoc: BuilderApiReadonlyExportV2): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const operation of exportDoc.operations) {
    if (seen.has(operation.operationCode)) {
      errors.push(`duplicate operation ${operation.operationCode}`);
    }
    seen.add(operation.operationCode);

    if (!['GET', 'HEAD'].includes(operation.method.toUpperCase())) {
      errors.push(`${operation.operationCode}: Builder SDK may expose read operations only`);
    }

    if (!operation.moduleCode || !operation.capabilityCode) {
      errors.push(`${operation.operationCode}: module/capability owner is required`);
    }

    if (!operation.scopeType || !operation.stability) {
      errors.push(`${operation.operationCode}: scope and stability are required`);
    }

    if (!operation.responseSchemaRefs.length && !operation.requestSchemaRef) {
      errors.push(`${operation.operationCode}: schema reference is required`);
    }
  }

  if (exportDoc.operationCount !== exportDoc.operations.length) {
    errors.push('operationCount does not match operations length');
  }

  return errors;
}

export function validateBuilderManifest(manifest: BuilderModuleCapabilityManifest): string[] {
  const errors: string[] = [];

  if (manifest.modules.length === 0) {
    errors.push('manifest requires at least one module');
  }

  if (manifest.capabilities.length === 0) {
    errors.push('manifest requires at least one capability');
  }

  for (const capability of manifest.capabilities) {
    if (!capability.moduleCode || !capability.capabilityCode) {
      errors.push('capability manifest rows require module and capability codes');
    }

    if (capability.artifactStatus === 'ready' && capability.warningCodes.length > 0) {
      errors.push(`${capability.capabilityCode}: ready rows cannot keep warning codes`);
    }
  }

  return errors;
}
