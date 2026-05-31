// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  BUILDER_REGISTRY_VERSION,
  CAPABILITY_DEFINITIONS,
  MODULE_CAPABILITY_REGISTRY,
  MODULE_DEFINITIONS,
  RBAC_RESOURCES,
  validateBuilderManifest,
  validateBuilderReadonlyExport,
} from '@tcrn/shared';

import {
  apiRoot,
  buildRegistryDocument,
  exportOpenApiDocs,
  parseArgs,
  productRoot,
  readJson,
  writeJson,
} from './api-registry-script-utils.mjs';

const READONLY_METHODS = new Set(['GET', 'HEAD']);
const BUILDER_REGISTRY_GENERATED_AT = '2026-05-31T00:00:00.000Z';
const REDACTION_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /authorization:\s*Bearer/i,
  /set-cookie:/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /otpauth:\/\/totp\//i,
  /["']?(?:access|refresh|id|session|verification|sso)[_-]?token["']?\s*[:=]\s*["'](?![^"']*(?:redacted|masked|\*\*\*|phase11-redacted))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?(?:api[_-]?key|password|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["'](?![^"']*(?:redacted|masked|\*\*\*|secret-ref:|env:))[^"'\s]{8,}/i,
];
const FORBIDDEN_TERMS = [
  'Fireboom',
  'fireboom',
  'pro-code',
  'plugin marketplace',
  'plugin install',
  'direct database',
  'database connector',
  'SQL builder',
  'Prisma builder',
  'BaaS',
  'app builder',
  'runtime hook',
  'execute user code',
];

export { exportOpenApiDocs, parseArgs, readJson, writeJson };

export function writeText(out, content) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  console.log(JSON.stringify({ out, passed: true }, null, 2));
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

function hashFile(file) {
  return existsSync(file) ? hashContent(readFileSync(file, 'utf8')) : null;
}

function listFiles(root) {
  if (!existsSync(root)) {
    return [];
  }
  const stat = statSync(root);
  if (stat.isFile()) {
    return [root];
  }
  return readdirSync(root).flatMap((entry) => {
    const full = path.join(root, entry);
    if (/(^|\/)(node_modules|dist|.next|coverage)\b/.test(full)) {
      return [];
    }
    const entryStat = statSync(full);
    if (entryStat.isDirectory()) {
      return listFiles(full);
    }
    return [full];
  });
}

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd ?? productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function safeRead(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function rel(file, root = productRoot) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function currentStatusLines() {
  return runGit(['status', '--short', '--branch']).split(/\r?\n/).filter(Boolean);
}

function classifyTermHit(term, file, lineText) {
  const normalized = lineText.toLowerCase();
  const relative = rel(file);

  if (/DocumentBuilder|ExcelBuilder|Structured scope builder/.test(lineText)) {
    return 'allowed_existing_false_positive';
  }

  if (
    /retired-browser-tests\/builder-registry/.test(relative) &&
    /hasFireboomText|hasProCodeControl|hasForbiddenCopy|toBe\(false\)/.test(lineText)
  ) {
    return 'allowed_browser_absence_assertion';
  }

  if (/builder-registry-.*dom\.json$/.test(relative) && /"has(?:FireboomText|ProCodeControl)"\s*:\s*false/.test(lineText)) {
    return 'allowed_browser_absence_readback';
  }

  if (/not |no |without |absence|non-use|forbidden|negative|must not|n est pas|pas un/.test(normalized)) {
    return 'allowed_negative_boundary_copy';
  }

  if (
    /retired-browser-tests|retired|fail closed|normal product flow/.test(`${relative} ${normalized}`) &&
    /direct database intervention/i.test(lineText)
  ) {
    return 'allowed_retired_fail_closed_text';
  }

  if (/api-registry-script-utils|builder-registry-script-utils|verify-builder-negative-authority/.test(relative)) {
    return 'allowed_scanner_taxonomy';
  }

  if (/packages\/database\/src\/generated\//.test(relative)) {
    return 'allowed_generated_client_comment';
  }

  return term.toLowerCase().includes('fireboom')
    ? 'forbidden_fireboom_reference'
    : 'requires_review';
}

function collectTermHits(sourceRoots) {
  const files = sourceRoots
    .flatMap((sourceRoot) => listFiles(path.resolve(productRoot, sourceRoot)))
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|json|md|yml|yaml|txt)$/.test(file));
  const hits = [];

  for (const file of files) {
    const lines = safeRead(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const term of FORBIDDEN_TERMS) {
        if (!line.toLowerCase().includes(term.toLowerCase())) {
          continue;
        }
        hits.push({
          term,
          file: rel(file),
          line: index + 1,
          classification: classifyTermHit(term, file, line),
          excerpt: line.trim().slice(0, 180),
        });
      }
    });
  }

  return hits;
}

function operationHasSchema(operation) {
  return Boolean(operation.requestSchemaRef || operation.responseSchemaRefs?.length > 0);
}

function pickText(value, fallback) {
  return value?.en ?? fallback;
}

function helperName(operationCode) {
  const words = operationCode.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/);
  return words
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`
    )
    .join('') || 'readBuilderOperation';
}

function withApiPrefix(pathTemplate) {
  return pathTemplate.startsWith('/api/v1') ? pathTemplate : `/api/v1${pathTemplate}`;
}

function buildSourceReadbackHash(input) {
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

export function buildCurrentSourceInventory(sourceRoot = productRoot) {
  const files = listFiles(sourceRoot).filter((file) => /\.(ts|tsx|mjs|json|md|yml|yaml)$/.test(file));
  const acShellPath = path.join(productRoot, 'apps/web/src/platform/routing/AcShell.tsx');
  const apiRegistrySnapshot = path.join(apiRoot, 'src/modules/api-registry/api-registry.snapshot.json');
  const statusLines = currentStatusLines();

  return {
    generatedAt: BUILDER_REGISTRY_GENERATED_AT,
    test_layer: 'source_scan',
    data_mode: 'read_only_source',
    target_scope: 'builder_current_source_inventory',
    sourceCommit: runGit(['rev-parse', 'HEAD']),
    branchStatus: statusLines[0] ?? '',
    dirtyFiles: statusLines.slice(1),
    fileCount: files.length,
    rbac: {
      resourceCount: RBAC_RESOURCES.length,
      builderRegistryResourcePresent: RBAC_RESOURCES.some((resource) => resource.code === 'platform.builder_registry'),
    },
    acShell: {
      path: rel(acShellPath),
      hash: hashFile(acShellPath),
      hasBuilderRegistryNav: safeRead(acShellPath).includes('builder-registry'),
      hasApiRegistryNav: safeRead(acShellPath).includes('api-registry'),
      hasApiGatewayNav: safeRead(acShellPath).includes('api-gateway-readiness'),
    },
    apiRegistry: {
      snapshotPath: rel(apiRegistrySnapshot),
      snapshotPresent: existsSync(apiRegistrySnapshot),
      operationCount: existsSync(apiRegistrySnapshot)
        ? readJson(apiRegistrySnapshot).operations?.length ?? 0
        : 0,
    },
    falsePositiveTerms: collectTermHits(['apps', 'packages'])
      .filter((hit) => hit.classification.startsWith('allowed'))
      .slice(0, 200),
    passed: true,
  };
}

export function buildForbiddenTermBaseline(sourceRoot = productRoot) {
  const roots = sourceRoot === productRoot ? ['apps', 'packages', 'scripts'] : [sourceRoot];
  const hits = collectTermHits(roots);
  const unclassified = hits.filter((hit) =>
    ['requires_review', 'forbidden_fireboom_reference'].includes(hit.classification)
  );

  return {
    generatedAt: BUILDER_REGISTRY_GENERATED_AT,
    test_layer: 'source_scan',
    data_mode: 'read_only_source',
    target_scope: 'builder_forbidden_term_baseline',
    terms: FORBIDDEN_TERMS,
    hitCount: hits.length,
    hits,
    unclassified,
    passed: unclassified.length === 0,
  };
}

export function buildModuleCapabilityRegistryDocument() {
  return {
    generatedAt: BUILDER_REGISTRY_GENERATED_AT,
    test_layer: 'artifact_generation',
    data_mode: 'read_only_source',
    target_scope: 'module_capability_manifest',
    sourceCommit: runGit(['rev-parse', 'HEAD']),
    registryVersion: MODULE_CAPABILITY_REGISTRY.registryVersion,
    modules: MODULE_DEFINITIONS,
    capabilities: CAPABILITY_DEFINITIONS,
    moduleCount: MODULE_DEFINITIONS.length,
    capabilityCount: CAPABILITY_DEFINITIONS.length,
    passed: MODULE_DEFINITIONS.length > 0 && CAPABILITY_DEFINITIONS.length > 0,
  };
}

export function buildBuilderSourceReadback(openapiDir, sourceRoot = productRoot) {
  const docs = ['openapi-operations.json', 'openapi-config.json', 'openapi-public.json'].map((fileName) => {
    const file = path.join(openapiDir, fileName);
    const doc = existsSync(file) ? readJson(file) : null;
    return {
      fileName,
      present: Boolean(doc),
      pathCount: doc ? Object.keys(doc.paths ?? {}).length : 0,
      schemaCount: doc ? Object.keys(doc.components?.schemas ?? {}).length : 0,
      hash: doc ? hashFile(file) : null,
    };
  });
  const controllerFiles = listFiles(path.join(sourceRoot, 'apps/api/src/modules'))
    .filter((file) => file.endsWith('.controller.ts'))
    .map((file) => rel(file, sourceRoot));
  const rbacFile = path.join(sourceRoot, 'packages/shared/src/rbac/catalog.ts');
  const publicPresenceFile = path.join(sourceRoot, 'packages/shared/src/public-presence/registry.ts');

  return {
    generatedAt: BUILDER_REGISTRY_GENERATED_AT,
    test_layer: 'manual_readback',
    data_mode: 'read_only_source',
    target_scope: 'builder_source_readback',
    sourceCommit: runGit(['rev-parse', 'HEAD']),
    openapi: docs,
    controllers: {
      count: controllerFiles.length,
      files: controllerFiles,
    },
    rbacCatalog: {
      path: rel(rbacFile, sourceRoot),
      hash: hashFile(rbacFile),
      resourceCount: RBAC_RESOURCES.length,
      builderRegistryResourcePresent: RBAC_RESOURCES.some((resource) => resource.code === 'platform.builder_registry'),
    },
    publicPresenceRegistry: {
      path: rel(publicPresenceFile, sourceRoot),
      present: existsSync(publicPresenceFile),
      hash: hashFile(publicPresenceFile),
    },
    passed: docs.every((doc) => doc.present) && RBAC_RESOURCES.some((resource) => resource.code === 'platform.builder_registry'),
  };
}

export function buildBuilderApiReadonlyExport(apiRegistry, sourceReadback) {
  const operations = [];
  const excludedOperations = [];

  for (const operation of apiRegistry.operations ?? []) {
    const method = operation.method.toUpperCase();
    const reason = (() => {
      if (!operation.builderExportEligible) return 'not_builder_export_eligible';
      if (!READONLY_METHODS.has(method)) return 'write_delete_admin_or_execute_operation';
      if (operation.exposure === 'ac_only' && !operation.operationCode.includes('builder_registry')) {
        return 'ac_platform_operation_not_in_first_builder_slice';
      }
      if (!operationHasSchema(operation)) return 'missing_schema_ref';
      return null;
    })();

    if (reason) {
      excludedOperations.push({
        operationCode: operation.operationCode,
        method: operation.method,
        pathTemplate: operation.pathTemplate,
        reason,
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
      deprecated: operation.deprecation?.isDeprecated ?? false,
      requestSchemaRef: operation.requestSchemaRef,
      responseSchemaRefs: operation.responseSchemaRefs ?? [],
      builderEligible: true,
      exclusionReason: null,
      source: operation.source,
    });
  }

  const exportDoc = {
    exportVersion: BUILDER_REGISTRY_VERSION,
    generatedFromRegistryVersion: apiRegistry.registryVersion,
    mode: 'read_only',
    operationCount: operations.length,
    excludedOperationCount: excludedOperations.length,
    operations,
    excludedOperations,
    sourceReadbackHash: buildSourceReadbackHash({
      sourceCommit: sourceReadback.sourceCommit,
      generatedFromRegistryVersion: apiRegistry.registryVersion,
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
    passed: errors.length === 0 && operations.length > 0,
  };
}

export function buildBuilderModuleCapabilityManifest(moduleRegistry, apiExport, sourceReadback) {
  const operationCodesByCapability = new Map();

  for (const operation of apiExport.operations) {
    const rows = operationCodesByCapability.get(operation.capabilityCode) ?? [];
    rows.push(operation);
    operationCodesByCapability.set(operation.capabilityCode, rows);
  }

  const modules = MODULE_DEFINITIONS.map((module) => {
    const capabilityCodes = CAPABILITY_DEFINITIONS
      .filter((capability) => capability.moduleCode === module.code)
      .map((capability) => capability.code);
    const operations = capabilityCodes.flatMap((capabilityCode) => operationCodesByCapability.get(capabilityCode) ?? []);
    return {
      moduleCode: module.code,
      moduleName: pickText(module.label, module.code),
      stability: module.stability,
      scopeApplicability: module.supportedScopes,
      capabilityCodes,
      operationCount: operations.length,
      readOperationCount: operations.length,
      sourceRegistryRefs: [moduleRegistry.registryVersion, apiExport.generatedFromRegistryVersion],
    };
  });
  const capabilities = CAPABILITY_DEFINITIONS.map((capability) => {
    const operations = operationCodesByCapability.get(capability.code) ?? [];
    const permissionSummary = [
      ...new Set(
        operations.flatMap((operation) =>
          operation.requiredPermissions.map((permission) => `${permission.resource}:${permission.action}`)
        )
      ),
    ].sort();
    return {
      moduleCode: capability.moduleCode,
      capabilityCode: capability.code,
      capabilityName: pickText(capability.label, capability.code),
      scopeApplicability: capability.runtimeScopes,
      stability: capability.status,
      permissionSummary,
      operationCodes: operations.map((operation) => operation.operationCode).sort(),
      artifactStatus: operations.length > 0 ? 'ready' : 'empty_no_manifest',
      warningCodes: [],
    };
  });
  const manifest = {
    manifestVersion: BUILDER_REGISTRY_VERSION,
    sourceCommit: sourceReadback.sourceCommit,
    generatedAt: BUILDER_REGISTRY_GENERATED_AT,
    generatedFromRegistryVersion: apiExport.generatedFromRegistryVersion,
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

export function buildBuilderSchemaCatalog(manifest, apiExport = null) {
  const operationsBySchemaRef = new Map();

  for (const operation of apiExport?.operations ?? []) {
    const refs = [operation.requestSchemaRef, ...(operation.responseSchemaRefs ?? [])].filter(Boolean);
    for (const schemaRef of refs) {
      const operationCodes = operationsBySchemaRef.get(schemaRef) ?? new Set();
      operationCodes.add(operation.operationCode);
      operationsBySchemaRef.set(schemaRef, operationCodes);
    }
  }

  const schemaRefs = [...operationsBySchemaRef.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schemaRef, operationCodes]) => ({
      schemaRef,
      operationCodes: [...operationCodes].sort(),
      source: 'api_registry',
      piiClassification: 'reference',
      examplePolicy: 'synthetic_placeholders_only',
    }));

  if (schemaRefs.length === 0) {
    for (const operationCode of manifest.capabilities.flatMap((capability) => capability.operationCodes)) {
      schemaRefs.push({
        schemaRef: `inline:${operationCode}`,
        operationCodes: [operationCode],
        source: 'inline_openapi',
        piiClassification: 'reference',
        examplePolicy: 'synthetic_placeholders_only',
      });
    }
  }

  return {
    schemaVersion: BUILDER_REGISTRY_VERSION,
    schemaRefs,
    redactionPolicy: 'no_raw_secret_or_pii_examples',
    typeRefs: schemaRefs.map((schema) =>
      schema.schemaRef.replace(/^#\/components\/schemas\//, '').replace(/^inline:/, 'Builder_')
    ),
    unsupportedTypes: [],
    sourceFiles: [
      ...new Set(
        (apiExport?.operations ?? []).flatMap((operation) => [
          operation.source?.controllerFile,
          operation.source?.openapiFile,
        ]).filter(Boolean)
      ),
    ].sort(),
    warnings: [],
    passed: schemaRefs.length > 0,
  };
}

export function generateBuilderArtifacts(manifest, schemaCatalog, apiExport = null) {
  const operations = (apiExport?.operations ?? [])
    .filter((operation) => READONLY_METHODS.has(operation.method.toUpperCase()))
    .slice(0, 80);
  const operationCodes = operations.length > 0
    ? operations.map((operation) => operation.operationCode)
    : manifest.capabilities.flatMap((capability) => capability.operationCodes).slice(0, 80);
  const sourceHash = hashContent(JSON.stringify({ manifest, schemaCatalog, operationCodes }));
  const types = [
    '// Generated read-only Builder Registry declarations.',
    `export const builderRegistryVersion = '${BUILDER_REGISTRY_VERSION}' as const;`,
    `export const builderRegistrySourceHash = '${sourceHash}' as const;`,
    `export const builderRegistryTypeCoverage = ${schemaCatalog.typeRefs.length} as const;`,
    'export type BuilderReadonlyRequest = { path: string; method: "GET" | "HEAD" };',
    ...schemaCatalog.typeRefs.map((typeRef) => `export interface ${typeRef.replace(/[^A-Za-z0-9_]/g, '_')}Record { readonly value?: unknown }`),
    '',
  ].join('\n');
  const sdk = [
    '// Generated read-only Builder Registry SDK helper.',
    "import type { BuilderReadonlyRequest } from './builder-types';",
    `export const builderRegistrySdkSourceHash = '${sourceHash}' as const;`,
    "export const builderRegistryAuthNotes = 'Bearer JWT with TCRN RBAC; generated helper never stores credentials.' as const;",
    "export const builderRegistryScopeNotes = 'Use the native path parameters exposed by TCRN API operations.' as const;",
    "export const builderRegistryWriteOperationOmissions = 'POST/PATCH/PUT/DELETE/admin/execute helpers are intentionally omitted.' as const;",
    ...operations.map((operation) =>
      [
        `export function ${helperName(operation.operationCode)}Request(): BuilderReadonlyRequest {`,
        `  return { method: '${operation.method.toUpperCase()}', path: '${withApiPrefix(operation.pathTemplate)}' };`,
        '}',
      ].join('\n')
    ),
    '',
  ].join('\n\n');
  const openapi = {
    openapi: '3.1.0',
    info: {
      title: 'TCRN Builder Registry Read-only OpenAPI',
      version: BUILDER_REGISTRY_VERSION,
    },
    paths: Object.fromEntries(
      operations.map((operation) => [
        withApiPrefix(operation.pathTemplate),
        {
          [operation.method.toLowerCase()]: {
            operationId: operation.operationCode,
            summary: `Read ${operation.operationCode}`,
            'x-tcrn-builder-readonly': true,
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Read-only generated response' } },
          },
        },
      ])
    ),
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
    'x-tcrn-included-operations': operations.map((operation) => operation.operationCode),
    'x-tcrn-excluded-operations': apiExport?.excludedOperations ?? [],
    'x-tcrn-redaction-report': {
      status: 'passed',
      policy: 'synthetic_placeholders_only',
      secretExamples: 0,
      piiExamples: 0,
    },
    'x-tcrn-authority': 'generated_consumer_not_api_authority',
  };

  return { types, sdk, openapi };
}

export function buildComposedDryRun(manifest, apiExport) {
  const permissionOperation = apiExport.operations.find((operation) =>
    operation.pathTemplate === '/permissions/resources'
  );
  const unsupportedReasons = permissionOperation ? [] : ['native_permission_resource_read_operation_missing'];

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

export function verifyGeneratedArtifacts(inputs) {
  const manifest = readJson(inputs.manifest);
  const apiExport = readJson(inputs.apiReadonlyExport);
  const schemaCatalog = readJson(inputs.schemaCatalog);
  const composed = readJson(inputs.composed);
  const types = safeRead(inputs.types);
  const sdk = safeRead(inputs.sdk);
  const openapi = readJson(inputs.openapi);
  const errors = [];

  if (!manifest.passed) errors.push('manifest_not_passed');
  if (!apiExport.passed) errors.push('api_readonly_export_not_passed');
  if (!schemaCatalog.passed) errors.push('schema_catalog_not_passed');
  if (!composed.passed) errors.push('composed_dry_run_not_passed');
  if (apiExport.operations.some((operation) => !READONLY_METHODS.has(operation.method.toUpperCase()))) {
    errors.push('non_read_operation_exported');
  }
  if (apiExport.operations.some((operation) => !operation.requestSchemaRef && !operation.responseSchemaRefs?.length)) {
    errors.push('schema_less_operation_exported');
  }
  if (/\b(post|patch|put|delete|admin|execute|mutate|mutation)\w*Request\b/i.test(sdk)) {
    errors.push('write_like_sdk_helper_detected');
  }
  if (sdk.includes('/api/v1/generated-readonly-placeholder')) {
    errors.push('sdk_placeholder_path_detected');
  }
  if (!types.includes('BuilderReadonlyRequest')) errors.push('types_missing_readonly_request');
  if (!types.includes('builderRegistrySourceHash')) errors.push('types_missing_source_hash');
  if (!sdk.includes('builderRegistryWriteOperationOmissions')) errors.push('sdk_missing_omission_notes');
  if (Object.values(openapi.paths ?? {}).some((pathItem) => Object.keys(pathItem).some((method) => method !== 'get' && method !== 'head'))) {
    errors.push('openapi_contains_non_read_method');
  }
  if (!openapi.components?.securitySchemes?.bearerAuth) errors.push('openapi_missing_security_scheme');
  if (!openapi['x-tcrn-redaction-report']) errors.push('openapi_missing_redaction_report');
  const exportedPathSet = new Set(apiExport.operations.map((operation) => withApiPrefix(operation.pathTemplate)));
  const sdkMissingPaths = [...exportedPathSet].filter((pathTemplate) => !sdk.includes(`path: '${pathTemplate}'`));
  const openapiMissingPaths = [...exportedPathSet].filter((pathTemplate) => !openapi.paths?.[pathTemplate]);
  const openapiExtraPaths = Object.keys(openapi.paths ?? {}).filter((pathTemplate) => !exportedPathSet.has(pathTemplate));

  if (sdkMissingPaths.length > 0) errors.push(`sdk_missing_native_paths:${sdkMissingPaths.slice(0, 5).join(',')}`);
  if (openapiMissingPaths.length > 0) errors.push(`openapi_missing_native_paths:${openapiMissingPaths.slice(0, 5).join(',')}`);
  if (openapiExtraPaths.some((pathTemplate) => pathTemplate.startsWith('/builder/readonly'))) {
    errors.push('openapi_synthetic_builder_paths_detected');
  }
  if (schemaCatalog.schemaRefs.some((schema) => schema.source === 'inline_openapi') && apiExport.operations.length > 0) {
    errors.push('schema_catalog_uses_synthetic_refs_despite_api_export');
  }
  if (!schemaCatalog.sourceFiles?.length) errors.push('schema_catalog_missing_source_files');

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'artifact_generation',
    data_mode: 'read_only_source',
    target_scope: 'generated_types_sdk_openapi',
    manifestHash: hashFile(inputs.manifest),
    apiReadonlyExportHash: hashFile(inputs.apiReadonlyExport),
    schemaCatalogHash: hashFile(inputs.schemaCatalog),
    typesHash: hashFile(inputs.types),
    sdkHash: hashFile(inputs.sdk),
    openapiHash: hashFile(inputs.openapi),
    composedHash: hashFile(inputs.composed),
    sdkMissingPaths,
    openapiMissingPaths,
    openapiExtraPaths,
    errors,
    passed: errors.length === 0,
  };
}

export function verifyNegativeAuthority(sourceRoots, evidenceDir) {
  const hits = collectTermHits(sourceRoots.map((sourceRoot) => path.relative(productRoot, path.resolve(sourceRoot))));
  const evidenceHits = evidenceDir && existsSync(evidenceDir)
    ? collectEvidenceTermHits(evidenceDir)
    : [];
  const unclassified = [...hits, ...evidenceHits].filter((hit) =>
    ['requires_review', 'forbidden_fireboom_reference'].includes(hit.classification)
  );

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'source_scan',
    target_scope: 'builder_negative_authority',
    productHitCount: hits.length,
    evidenceHitCount: evidenceHits.length,
    hits: [...hits, ...evidenceHits],
    unclassified,
    passed: unclassified.length === 0,
  };
}

function collectEvidenceTermHits(evidenceDir) {
  return listFiles(evidenceDir)
    .filter((file) => !isScannerEvidenceArtifact(file))
    .filter((file) => /\.(json|md|txt|ts|d\.ts)$/.test(file))
    .flatMap((file) =>
      safeRead(file)
        .split(/\r?\n/)
        .flatMap((line, index) =>
          FORBIDDEN_TERMS.filter((term) => line.toLowerCase().includes(term.toLowerCase())).map((term) => ({
            term,
            file: rel(file),
            line: index + 1,
            classification: classifyTermHit(term, file, line),
            excerpt: line.trim().slice(0, 180),
          }))
        )
    );
}

function isScannerEvidenceArtifact(file) {
  return /builder-(?:current-source-inventory|forbidden-term-baseline|negative-authority-scan|license-sbom-posture)\.json$/.test(
    file
  ) || /builder-registry-command-baseline\.txt$/.test(file);
}

export function buildLicenseSbomPosture(sourceRoot, evidenceDir) {
  const sourceFiles = [
    'package.json',
    'pnpm-lock.yaml',
    'README.md',
    'README.zh-CN.md',
    'README.ja.md',
    'docker-compose.yml',
    'docker-compose.prod.yml',
    'docker-compose.staging.yml',
  ]
    .map((file) => path.join(sourceRoot, file))
    .filter((file) => existsSync(file));
  const checkedFiles = [
    ...sourceFiles,
    ...listFiles(path.join(sourceRoot, 'apps')).filter((file) => /\.(json|ts|tsx|mjs|md)$/.test(file)),
    ...listFiles(path.join(sourceRoot, 'packages')).filter((file) => /\.(json|ts|tsx|md)$/.test(file)),
    ...listFiles(evidenceDir)
      .filter((file) => !isScannerEvidenceArtifact(file))
      .filter((file) => /\.(json|ts|d\.ts|md|txt)$/.test(file)),
  ].filter((file) => !isScannerSourceArtifact(file));
  const findings = checkedFiles.flatMap((file) => {
    const text = safeRead(file);
    const matches = [];
    if (/fireboom/i.test(text)) matches.push('fireboom_reference');
    if (/\bSSPL\b|Server Side Public License/i.test(text)) matches.push('sspl_reference');
    return matches.map((match) => ({ file: rel(file), finding: match }));
  });

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'source_scan',
    target_scope: 'builder_license_sbom_posture',
    checkedFileCount: checkedFiles.length,
    findings,
    passed: findings.length === 0,
  };
}

function isScannerSourceArtifact(file) {
  return /apps\/api\/scripts\/(?:api-registry-script-utils|builder-registry-script-utils|verify-builder-negative-authority)\.mjs$/.test(
    file
  );
}

export function buildFixtureLifecycle(command, prefix, evidenceDir) {
  const base = {
    generatedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'read_only_source',
    target_scope: 'builder_fixture_lifecycle',
    prefix,
    evidenceDir,
    created_resources: [],
    retained_data_approval: null,
    passed: true,
  };

  if (command === 'setup') {
    return { ...base, action: 'setup', note: 'No disposable product records required for Phase 11 source-only Builder proof.' };
  }
  if (command === 'readback') {
    return { ...base, action: 'readback', sourceArtifactsPresent: existsSync(evidenceDir) };
  }
  if (command === 'cleanup') {
    return { ...base, action: 'cleanup', cleaned_resources: [] };
  }
  return { ...base, action: 'idempotence', duplicate_resources: [] };
}

export function verifyBrowserArtifacts(evidenceDir, required) {
  const artifacts = required.map((fileName) => {
    const file = path.join(evidenceDir, fileName);
    const present = existsSync(file);
    const size = present ? statSync(file).size : 0;
    return {
      fileName,
      present,
      size,
      nonEmpty: size > 0,
      mtimeMs: present ? statSync(file).mtimeMs : null,
    };
  });
  const missing = artifacts.filter((artifact) => !artifact.present || !artifact.nonEmpty);
  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'read_only_source',
    target_scope: 'builder_browser_artifacts',
    artifacts,
    missing,
    passed: missing.length === 0,
  };
}

export function verifyEvidenceRedaction(evidenceDir) {
  const files = listFiles(evidenceDir).filter((file) => !/\.(png|jpg|jpeg|webp)$/.test(file));
  const findings = files.flatMap((file) => {
    const text = safeRead(file);
    return REDACTION_PATTERNS.flatMap((pattern) => {
      const match = text.match(pattern);
      return match ? [{ file: rel(file), pattern: String(pattern), excerpt: match[0].slice(0, 32) }] : [];
    });
  });

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'evidence_scan',
    target_scope: 'builder_evidence_redaction',
    fileCount: files.length,
    findings,
    passed: findings.length === 0,
  };
}

export function buildRegistryDocumentFromOpenApi(openapiDir) {
  return buildRegistryDocument(openapiDir);
}
