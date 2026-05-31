import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  BUILDER_REGISTRY_GENERATED_AT,
  BUILDER_REGISTRY_VERSION,
  CAPABILITY_DEFINITIONS,
  MODULE_CAPABILITY_REGISTRY,
  MODULE_DEFINITIONS,
  RBAC_RESOURCES,
  normalizeSupportedUiLocale,
  pickLocalizedText,
  type ApiOperationDefinition,
  type ApiRegistryDocument,
  type BuilderApiReadonlyExportV2,
  type BuilderApiReadonlyOperation,
  type BuilderComposedOperationDryRun,
  type BuilderGeneratedArtifactStatus,
  type BuilderModuleCapabilityManifest,
  type BuilderRegistryArtifactDownload,
  type BuilderRegistryArtifactKind,
  type BuilderRegistryModulesResponse,
  type BuilderRegistryOperationDetail,
  type BuilderRegistrySummary,
  type BuilderSchemaCatalog,
  type LocalizedText,
  type SupportedUiLocale,
  validateBuilderManifest,
  validateBuilderReadonlyExport,
} from '@tcrn/shared';

import { ApiRegistryService } from '../api-registry/api-registry.service';

const READONLY_METHODS = new Set(['GET', 'HEAD']);

function withApiPrefix(pathTemplate: string) {
  return pathTemplate.startsWith('/api/v1') ? pathTemplate : `/api/v1${pathTemplate}`;
}

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function stableStringify(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toHelperName(operationCode: string) {
  const name = operationCode
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`
    )
    .join('');

  return name || 'readBuilderOperation';
}

function pickText(value: LocalizedText | undefined, fallback: string, locale?: SupportedUiLocale | string | null) {
  return value ? pickLocalizedText(value, locale) : fallback;
}

function isSchemaBacked(operation: ApiOperationDefinition) {
  return Boolean(operation.requestSchemaRef || operation.responseSchemaRefs.length > 0);
}

function buildSourceReadbackHash(input: {
  sourceCommit: string;
  generatedFromRegistryVersion: string;
  operationCount: number;
  excludedOperationCount: number;
}) {
  return hashContent(
    JSON.stringify({
      builderRegistryVersion: BUILDER_REGISTRY_VERSION,
      sourceCommit: input.sourceCommit,
      generatedFromRegistryVersion: input.generatedFromRegistryVersion,
      operationCount: input.operationCount,
      excludedOperationCount: input.excludedOperationCount,
    })
  );
}

@Injectable()
export class BuilderRegistryService {
  constructor(private readonly apiRegistryService: ApiRegistryService) {}

  getSummary(fresh = false): BuilderRegistrySummary {
    const manifest = this.getManifest();
    const apiExport = this.getApiReadonlyExport();
    const schemaCatalog = this.getSchemaCatalog();
    const composedDryRun = this.getComposedDryRun();
    const artifactStatuses = this.getArtifactStatuses();
    const warnings = [
      ...manifest.warnings,
      ...apiExport.warnings,
      ...schemaCatalog.warnings,
      ...composedDryRun.unsupportedReasons,
    ];
    const readOnlyArtifactStatus = artifactStatuses.every((artifact) => artifact.status === 'ready')
      ? 'ready'
      : 'partial_metadata_warning';
    const status = (() => {
      if (manifest.capabilities.length === 0 || apiExport.operations.length === 0) {
        return 'empty_no_manifest' as const;
      }
      if (artifactStatuses.some((artifact) => artifact.redactionStatus === 'failed')) {
        return 'redaction_warning' as const;
      }
      if (!manifest.passed || !apiExport.passed || !schemaCatalog.passed) {
        return 'partial_metadata_warning' as const;
      }
      if (!composedDryRun.passed) {
        return 'composition_unavailable' as const;
      }
      if (fresh && warnings.length > 0) {
        return 'partial_metadata_warning' as const;
      }
      return 'ready' as const;
    })();

    return {
      registryVersion: BUILDER_REGISTRY_VERSION,
      status,
      generatedAt: manifest.generatedAt,
      sourceCommit: manifest.sourceCommit,
      manifestVersion: manifest.manifestVersion,
      moduleCount: manifest.modules.length,
      capabilityCount: manifest.capabilities.length,
      operationCount: apiExport.operations.length,
      schemaCount: schemaCatalog.schemaRefs.length,
      readOnlyArtifactStatus,
      composedDryRunStatus: composedDryRun.passed ? 'ready' : 'composition_unavailable',
      artifactStatuses,
      warnings,
    };
  }

  getModules(locale?: SupportedUiLocale | string | null): BuilderRegistryModulesResponse {
    const manifest = this.getManifest(locale);
    const apiExport = this.getApiReadonlyExport();
    const excludedByCapability = new Map<string, number>();

    for (const operation of apiExport.excludedOperations) {
      const source = this.apiRegistryService
        .getDocument()
        .operations.find((candidate) => candidate.operationCode === operation.operationCode);
      const capabilityCode = source?.ownerCapabilityCode ?? 'unknown';
      excludedByCapability.set(capabilityCode, (excludedByCapability.get(capabilityCode) ?? 0) + 1);
    }

    return {
      rows: manifest.capabilities.map((capability) => ({
        moduleCode: capability.moduleCode,
        moduleName:
          manifest.modules.find((module) => module.moduleCode === capability.moduleCode)
            ?.moduleName ?? capability.moduleCode,
        capabilityCode: capability.capabilityCode,
        capabilityName: capability.capabilityName,
        scopeApplicability: capability.scopeApplicability,
        operationCount: capability.operationCodes.length,
        readOperationCount: capability.operationCodes.length,
        operationCodes: capability.operationCodes,
        excludedOperationCount: excludedByCapability.get(capability.capabilityCode) ?? 0,
        stability: capability.stability,
        permissionSummary: capability.permissionSummary,
        artifactStatus: capability.artifactStatus,
        lastVerifiedAt: manifest.generatedAt,
        warningCodes: capability.warningCodes,
      })),
    };
  }

  getOperation(operationCode: string): BuilderRegistryOperationDetail | null {
    const operation = this.getApiReadonlyExport().operations.find(
      (candidate) => candidate.operationCode === operationCode
    );

    if (!operation) {
      return null;
    }

    return {
      ...operation,
      responseSchemaRef: operation.responseSchemaRefs[0] ?? null,
    };
  }

  getArtifact(kind: BuilderRegistryArtifactKind): BuilderRegistryArtifactDownload {
    const contentByKind: Record<BuilderRegistryArtifactKind, { fileName: string; content: string; contentType: BuilderRegistryArtifactDownload['contentType'] }> = {
      manifest: {
        fileName: 'builder-module-capability-manifest.json',
        content: stableStringify(this.getManifest()),
        contentType: 'application/json',
      },
      'api-readonly-export': {
        fileName: 'builder-api-readonly-export.json',
        content: stableStringify(this.getApiReadonlyExport()),
        contentType: 'application/json',
      },
      'schema-catalog': {
        fileName: 'builder-schema-catalog.json',
        content: stableStringify(this.getSchemaCatalog()),
        contentType: 'application/json',
      },
      types: {
        fileName: 'builder-types.d.ts',
        content: this.getTypesDeclaration(),
        contentType: 'text/plain',
      },
      'sdk-readonly': {
        fileName: 'builder-sdk-readonly.ts',
        content: this.getReadonlySdk(),
        contentType: 'application/typescript',
      },
      'openapi-readonly': {
        fileName: 'builder-openapi-readonly.json',
        content: stableStringify(this.getReadonlyOpenApi()),
        contentType: 'application/json',
      },
      'composed-dry-run': {
        fileName: 'builder-composed-operation.dry-run.json',
        content: stableStringify(this.getComposedDryRun()),
        contentType: 'application/json',
      },
    };
    const artifact = contentByKind[kind];

    return {
      artifactKind: kind,
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      contentHash: hashContent(artifact.content),
      manifestVersion: BUILDER_REGISTRY_VERSION,
      redactionStatus: 'passed',
      cacheControl: 'no-store, private',
      content: artifact.content,
    };
  }

  getComposedDryRun(): BuilderComposedOperationDryRun {
    const manifest = this.getManifest();
    const apiExport = this.getApiReadonlyExport();
    const permissionOperation = this.apiRegistryService
      .getDocument()
      .operations.find(
        (operation) =>
          operation.method === 'GET' &&
          operation.pathTemplate === '/permissions/resources'
      );
    const unsupportedReasons = permissionOperation
      ? []
      : ['native_permission_resource_read_operation_missing'];

    return {
      operationCode: 'builder.acCapabilitySurfaceOverview.read',
      mode: 'dry_run',
      nativeOperationRefs: [
        {
          ref: 'permissions.resources.list',
          method: 'GET',
          pathTemplate: '/api/v1/permissions/resources',
          operationCode: permissionOperation?.operationCode ?? 'operations.permission_controller_get_resources',
        },
        {
          ref: 'builder.registry.summary.read',
          method: 'GET',
          pathTemplate: '/api/v1/builder-registry/summary?fresh=false',
          operationCode: 'config.builder_registry_controller_get_summary',
        },
        {
          ref: 'builder.registry.modules.list',
          method: 'GET',
          pathTemplate: '/api/v1/builder-registry/modules',
          operationCode: 'config.builder_registry_controller_get_modules',
        },
      ],
      inputSchema: {
        locale: 'SupportedUiLocale',
        includeWarnings: 'boolean',
      },
      permissionRequirements: [{ resource: 'platform.builder_registry', action: 'read' }],
      scopeRequirements: [
        'AC tenant context only',
        'No ordinary tenant, subsidiary, talent, SQL, script, external URL, or scopeId input',
      ],
      dryRunPlan: [
        'Read RBAC resource catalog through the existing permission resources endpoint.',
        'Read Builder Registry summary through the AC-only read endpoint.',
        'Read Builder Registry module rows through the AC-only read endpoint.',
        'Merge redacted counts and warning codes without storing product data.',
      ],
      redactedSampleOutput: {
        moduleCount: manifest.modules.length,
        capabilityCount: manifest.capabilities.length,
        operationCount: apiExport.operations.length,
        readOperationCount: apiExport.operations.length,
        rbacResourceGroupCount: RBAC_RESOURCES.length,
        warningCodes: [...manifest.warnings, ...apiExport.warnings],
        artifactStatus: unsupportedReasons.length === 0 ? 'ready' : 'composition_unavailable',
      },
      unsupportedReasons,
      passed: unsupportedReasons.length === 0,
    };
  }

  getManifest(locale: SupportedUiLocale | string | null = 'en'): BuilderModuleCapabilityManifest {
    const registry = this.apiRegistryService.getDocument();
    const apiExport = this.getApiReadonlyExport();
    const resolvedLocale = normalizeSupportedUiLocale(locale) ?? 'en';
    const operationCodesByCapability = new Map<string, BuilderApiReadonlyOperation[]>();

    for (const operation of apiExport.operations) {
      const rows = operationCodesByCapability.get(operation.capabilityCode) ?? [];
      rows.push(operation);
      operationCodesByCapability.set(operation.capabilityCode, rows);
    }

    const modules = MODULE_DEFINITIONS.map((module) => {
      const capabilityCodes = CAPABILITY_DEFINITIONS.filter(
        (capability) => capability.moduleCode === module.code
      ).map((capability) => capability.code);
      const operations = capabilityCodes.flatMap(
        (capabilityCode) => operationCodesByCapability.get(capabilityCode) ?? []
      );

      return {
        moduleCode: module.code,
        moduleName: pickText(module.label, module.code, resolvedLocale),
        stability: module.stability,
        scopeApplicability: module.supportedScopes,
        capabilityCodes,
        operationCount: operations.length,
        readOperationCount: operations.length,
        sourceRegistryRefs: [
          MODULE_CAPABILITY_REGISTRY.registryVersion,
          registry.registryVersion,
        ],
      };
    });
    const capabilities = CAPABILITY_DEFINITIONS.map((capability) => {
      const operations = operationCodesByCapability.get(capability.code) ?? [];
      const permissionSummary = [
        ...new Set(
          operations.flatMap((operation) =>
            operation.requiredPermissions.map(
              (permission) => `${permission.resource}:${permission.action}`
            )
          )
        ),
      ].sort();

      return {
        moduleCode: capability.moduleCode,
        capabilityCode: capability.code,
        capabilityName: pickText(capability.label, capability.code, resolvedLocale),
        scopeApplicability: capability.runtimeScopes,
        stability: capability.status,
        permissionSummary,
        operationCodes: operations.map((operation) => operation.operationCode).sort(),
        artifactStatus: operations.length > 0 ? 'ready' as const : 'empty_no_manifest' as const,
        warningCodes: [] as string[],
      };
    });
    const manifest: BuilderModuleCapabilityManifest = {
      manifestVersion: BUILDER_REGISTRY_VERSION,
      sourceCommit: registry.sourceCommit,
      generatedAt: BUILDER_REGISTRY_GENERATED_AT,
      generatedFromRegistryVersion: registry.registryVersion,
      modules,
      capabilities,
      dependencies: CAPABILITY_DEFINITIONS.flatMap((capability) =>
        capability.dependencies.map((dependency) => ({
          fromCapabilityCode: capability.code,
          toCapabilityCode: dependency,
        }))
      ),
      sourceReadbackHash: apiExport.sourceReadbackHash,
      warnings: [],
      passed: true,
    };
    const errors = validateBuilderManifest(manifest);

    return {
      ...manifest,
      warnings: errors,
      passed: errors.length === 0,
    };
  }

  getApiReadonlyExport(): BuilderApiReadonlyExportV2 {
    const registry = this.apiRegistryService.getDocument();
    const operations: BuilderApiReadonlyOperation[] = [];
    const excludedOperations: Array<BuilderApiReadonlyExportV2['excludedOperations'][number]> = [];

    for (const operation of registry.operations) {
      const method = operation.method.toUpperCase();
      const excludedReason = (() => {
        if (!operation.builderExportEligible) {
          return 'not_builder_export_eligible';
        }
        if (!READONLY_METHODS.has(method)) {
          return 'write_delete_admin_or_execute_operation';
        }
        if (operation.exposure === 'ac_only' && !operation.operationCode.includes('builder_registry')) {
          return 'ac_platform_operation_not_in_first_builder_slice';
        }
        if (!isSchemaBacked(operation)) {
          return 'missing_schema_ref';
        }
        return null;
      })();

      if (excludedReason) {
        excludedOperations.push({
          operationCode: operation.operationCode,
          method: operation.method,
          pathTemplate: operation.pathTemplate,
          reason: excludedReason,
        });
        continue;
      }

      operations.push({
        operationCode: operation.operationCode,
        moduleCode: operation.ownerModuleCode,
        capabilityCode: operation.ownerCapabilityCode,
        method: operation.method,
        pathTemplate: operation.pathTemplate,
        documentGroup: operation.documentGroup,
        exposure: operation.exposure,
        authMode: operation.authMode,
        requiredPermissions: operation.requiredPermissions,
        dynamicPermissionResolver: operation.dynamicPermissionResolver,
        scopeType: operation.scopeType,
        stability: operation.stability,
        deprecated: operation.deprecation.isDeprecated,
        requestSchemaRef: operation.requestSchemaRef,
        responseSchemaRefs: operation.responseSchemaRefs,
        builderEligible: true,
        exclusionReason: null,
        source: operation.source,
      });
    }

    const exportDoc: BuilderApiReadonlyExportV2 = {
      exportVersion: BUILDER_REGISTRY_VERSION,
      generatedFromRegistryVersion: registry.registryVersion,
      mode: 'read_only',
      operationCount: operations.length,
      excludedOperationCount: excludedOperations.length,
      operations,
      excludedOperations,
      sourceReadbackHash: buildSourceReadbackHash({
        sourceCommit: registry.sourceCommit,
        generatedFromRegistryVersion: registry.registryVersion,
        operationCount: operations.length,
        excludedOperationCount: excludedOperations.length,
      }),
      warnings: [],
      passed: true,
    };
    const errors = validateBuilderReadonlyExport(exportDoc);

    return {
      ...exportDoc,
      warnings: errors,
      passed: errors.length === 0,
    };
  }

  getSchemaCatalog(): BuilderSchemaCatalog {
    const apiExport = this.getApiReadonlyExport();
    const bySchema = new Map<string, Set<string>>();

    for (const operation of apiExport.operations) {
      for (const schemaRef of [
        operation.requestSchemaRef,
        ...operation.responseSchemaRefs,
      ].filter(Boolean) as string[]) {
        const operationCodes = bySchema.get(schemaRef) ?? new Set<string>();
        operationCodes.add(operation.operationCode);
        bySchema.set(schemaRef, operationCodes);
      }
    }

    const schemaRefs = [...bySchema.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([schemaRef, operationCodes]) => ({
        schemaRef,
        operationCodes: [...operationCodes].sort(),
        source: 'api_registry' as const,
        piiClassification: 'reference' as const,
        examplePolicy: 'synthetic_placeholders_only' as const,
      }));

    return {
      schemaVersion: BUILDER_REGISTRY_VERSION,
      schemaRefs,
      redactionPolicy: 'no_raw_secret_or_pii_examples',
      typeRefs: schemaRefs.map((schema) =>
        schema.schemaRef.replace(/^#\/components\/schemas\//, '').replace(/^inline:/, 'Builder_')
      ),
      unsupportedTypes: [],
      sourceFiles: [...new Set(apiExport.operations.flatMap((operation) => [
        operation.source.controllerFile,
        operation.source.openapiFile,
      ]).filter(Boolean) as string[])].sort(),
      warnings: [],
      passed: true,
    };
  }

  getArtifactStatuses(): BuilderGeneratedArtifactStatus[] {
    return BUILDER_REGISTRY_VERSION
      ? ([
          'manifest',
          'api-readonly-export',
          'schema-catalog',
          'types',
          'sdk-readonly',
          'openapi-readonly',
          'composed-dry-run',
        ] as const).map((kind) => {
          const artifact = this.getArtifact(kind);
          return {
            artifactKind: kind,
            status: 'ready',
            fileName: artifact.fileName,
            contentHash: artifact.contentHash,
            disabledReason: null,
            redactionStatus: 'passed',
          };
        })
      : [];
  }

  getArtifactStatus(kind: BuilderRegistryArtifactKind): BuilderGeneratedArtifactStatus {
    const artifactStatus = this.getArtifactStatuses().find((artifact) => artifact.artifactKind === kind);

    return artifactStatus ?? {
      artifactKind: kind,
      status: 'disabled',
      fileName: `${kind}.unavailable`,
      contentHash: '',
      disabledReason: 'Artifact status is unavailable',
      redactionStatus: 'failed',
    };
  }

  getTypesDeclaration(): string {
    const schemaCatalog = this.getSchemaCatalog();
    const apiExport = this.getApiReadonlyExport();
    const operations = apiExport.operations
      .filter((operation) => READONLY_METHODS.has(operation.method.toUpperCase()))
      .slice(0, 80);
    const operationCodes = operations.length > 0
      ? operations.map((operation) => operation.operationCode)
      : this.getManifest().capabilities.flatMap((capability) => capability.operationCodes).slice(0, 80);
    const sourceHash = hashContent(JSON.stringify({ manifest: this.getManifest(), schemaCatalog, operationCodes }));

    return [
      '// Generated read-only Builder Registry declarations.',
      `export const builderRegistryVersion = '${BUILDER_REGISTRY_VERSION}' as const;`,
      `export const builderRegistrySourceHash = '${sourceHash}' as const;`,
      `export const builderRegistryTypeCoverage = ${schemaCatalog.typeRefs.length} as const;`,
      'export type BuilderReadonlyRequest = { path: string; method: "GET" | "HEAD" };',
      ...schemaCatalog.typeRefs.map((typeRef) => `export interface ${typeRef.replace(/[^A-Za-z0-9_]/g, '_')}Record { readonly value?: unknown }`),
      '',
    ].join('\n');
  }

  getReadonlySdk(): string {
    const manifest = this.getManifest();
    const schemaCatalog = this.getSchemaCatalog();
    const operations = this.getApiReadonlyExport().operations
      .filter((operation) => READONLY_METHODS.has(operation.method.toUpperCase()))
      .slice(0, 80);
    const operationCodes = operations.length > 0
      ? operations.map((operation) => operation.operationCode)
      : manifest.capabilities.flatMap((capability) => capability.operationCodes).slice(0, 80);
    const sourceHash = hashContent(JSON.stringify({ manifest, schemaCatalog, operationCodes }));
    const helpers = operations.map((operation) => {
      const helperName = toHelperName(operation.operationCode);

      return [
        `export function ${helperName}Request(): BuilderReadonlyRequest {`,
        `  return { method: '${operation.method.toUpperCase() as 'GET' | 'HEAD'}', path: '${withApiPrefix(operation.pathTemplate)}' };`,
        '}',
      ].join('\n');
    });

    return [
      '// Generated read-only Builder Registry SDK helper.',
      "import type { BuilderReadonlyRequest } from './builder-types';",
      `export const builderRegistrySdkSourceHash = '${sourceHash}' as const;`,
      "export const builderRegistryAuthNotes = 'Bearer JWT with TCRN RBAC; generated helper never stores credentials.' as const;",
      "export const builderRegistryScopeNotes = 'Use the native path parameters exposed by TCRN API operations.' as const;",
      "export const builderRegistryWriteOperationOmissions = 'POST/PATCH/PUT/DELETE/admin/execute helpers are intentionally omitted.' as const;",
      ...helpers,
      '',
    ].join('\n\n');
  }

  getReadonlyOpenApi() {
    const apiExport = this.getApiReadonlyExport();
    const operations = apiExport.operations
      .filter((operation) => READONLY_METHODS.has(operation.method.toUpperCase()))
      .slice(0, 80);
    const paths = Object.fromEntries(
      operations.map((operation) => [
        withApiPrefix(operation.pathTemplate),
        {
          [operation.method.toLowerCase()]: {
            operationId: operation.operationCode,
            summary: `Read ${operation.operationCode}`,
            'x-tcrn-builder-readonly': true,
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: 'Read-only generated response' },
            },
          },
        },
      ])
    );

    return {
      openapi: '3.1.0',
      info: {
        title: 'TCRN Builder Registry Read-only OpenAPI',
        version: BUILDER_REGISTRY_VERSION,
      },
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      'x-tcrn-included-operations': operations.map(
        (operation) => operation.operationCode
      ),
      'x-tcrn-excluded-operations': apiExport.excludedOperations,
      'x-tcrn-redaction-report': {
        status: 'passed',
        policy: 'synthetic_placeholders_only',
        secretExamples: 0,
        piiExamples: 0,
      },
      'x-tcrn-authority': 'generated_consumer_not_api_authority',
    };
  }
}
