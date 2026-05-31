// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const apiRoot = path.resolve(scriptDir, '..');
export const productRoot = path.resolve(apiRoot, '../..');
export const API_REGISTRY_VERSION = '2026-05-31.phase-9';
export const DOCUMENT_GROUP_FILES = {
  operations: 'openapi-operations.json',
  config: 'openapi-config.json',
  public: 'openapi-public.json',
};
export const AUTHORITY_SNAPSHOT_PATH = path.join(
  apiRoot,
  'src/modules/api-registry/api-registry.authority.json'
);
export const SOURCE_SNAPSHOT_PATH = path.join(
  apiRoot,
  'src/modules/api-registry/api-registry.snapshot.json'
);
export const RUNTIME_DRIFT_REPORT_PATH = path.join(
  apiRoot,
  'src/modules/api-registry/api-registry.drift-report.json'
);
const COMPONENT_SCHEMA_REF_PATTERN = /#\/components\/schemas\/[A-Za-z0-9_.-]+/g;

const TAG_OWNERS = [
  [/^Public\b/, ['public_presence', 'public_presence.homepage']],
  [/Homepage|Public - Assets|Public - Domain/, ['public_presence', 'public_presence.homepage']],
  [/Marshmallow/, ['marshmallow', 'marshmallow.mailbox']],
  [/Reports|Export|Import/, ['reports', 'reports.mfr']],
  [/Integration|Webhook/, ['integration', 'integration.webhooks']],
  [/Customer/, ['core', 'core.organization']],
  [/Org - Tree|Org - Subsidiaries|Org - Talents/, ['core', 'core.organization']],
  [/System - Users|System - Roles|System - Permissions|Auth/, ['core', 'core.user_access']],
  [/System - Settings|System - Config|System - Dictionary|System - PII/, ['core', 'core.settings']],
  [/System - Logs|Compliance/, ['observability', 'observability.product_audit']],
  [
    /System - Platform Tools|System - Runtime Flags|System - Event Backbone|System - API Registry|Org - Tenants|System - Delegated Admin|System - Security/,
    ['platform', 'platform.ac_management'],
  ],
];

const FORBIDDEN_EVIDENCE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /authorization:\s*Bearer/i,
  /set-cookie:/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:access|refresh|id|session|verification|sso|turnstile)[_-]?token\b\s*[:=]\s*["']?(?!secret-ref:|env:|redacted|masked)[A-Za-z0-9._~+/=-]{8,}/i,
  /["']?access_token["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?accessToken["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?refresh_token["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?refreshToken["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?api[_-]?key["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[A-Za-z0-9._~+/=-]{12,}/i,
  /["']?password["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[^"'\s]{8,}/i,
  /["']?client_secret["']?\s*[:=]\s*["'](?!(?:[^"']*\*\*\*|secret-ref:|env:))[^"'\s]{8,}/i,
];
const READONLY_GATEWAY_METHODS = new Set(['GET', 'HEAD']);

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (next && !next.startsWith('--')) {
        if (options[key] === undefined) {
          options[key] = next;
        } else if (Array.isArray(options[key])) {
          options[key].push(next);
        } else {
          options[key] = [options[key], next];
        }
        index += 1;
      } else {
        options[key] = true;
      }
    }
  }

  return options;
}

export function writeJson(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    JSON.stringify(
      {
        out,
        passed: payload.passed ?? (payload.result ? payload.result === 'pass' : true),
        result: payload.result,
        operationCount: payload.operationCount ?? payload.operations?.length,
        routeCount: payload.routes?.length,
        checkedAt: payload.checkedAt,
      },
      null,
      2
    )
  );

  if (payload.passed === false || payload.result === 'fail') {
    process.exitCode = 1;
  }
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function operationKeyForParts(documentGroup, method, pathTemplate) {
  return `${documentGroup} ${method.toUpperCase()} ${pathTemplate}`;
}

function operationKey(operation) {
  return operationKeyForParts(
    operation.documentGroup,
    operation.method,
    operation.pathTemplate ?? operation.normalizedPath
  );
}

function inlineSchemaRef(fallback) {
  return `inline:${fallback.replace(/[^A-Za-z0-9_.:-]+/g, '_').toLowerCase()}`;
}

function schemaRefsFromSchema(schema, fallback) {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const refs = JSON.stringify(schema).match(COMPONENT_SCHEMA_REF_PATTERN) ?? [];
  if (refs.length > 0) {
    return uniqueSorted(refs);
  }

  return Object.keys(schema).length > 0 ? [inlineSchemaRef(fallback)] : [];
}

function schemaRefsFromContent(content, fallback) {
  return Object.entries(content ?? {}).flatMap(([mediaType, media]) =>
    schemaRefsFromSchema(media?.schema, `${fallback}:${mediaType}`)
  );
}

function collectRequestSchemaRefs(operation) {
  return uniqueSorted(
    schemaRefsFromContent(
      operation.requestBody?.content,
      `${operation.operationId ?? operation.method}:request`
    )
  );
}

function collectResponseSchemaRefs(operation) {
  const refs = [];

  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    refs.push(
      ...schemaRefsFromContent(
        response?.content,
        `${operation.operationId ?? operation.method}:response:${status}`
      )
    );
  }

  return uniqueSorted(refs);
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function normalizePermissionList(permissions) {
  return [...(permissions ?? [])]
    .map((permission) => ({ resource: permission.resource, action: permission.action }))
    .sort((left, right) =>
      `${left.resource}:${left.action}`.localeCompare(`${right.resource}:${right.action}`)
    );
}

function permissionListKey(permissions) {
  return JSON.stringify(normalizePermissionList(permissions));
}

export function compareRegistryAuthority(registryOperations, authorityOperations) {
  const authorityByOperationCode = new Map(
    authorityOperations.map((operation) => [operation.operationCode, operation])
  );
  const permissionMismatch = [];
  const scopeMismatch = [];
  const exposureMismatch = [];
  const authMismatch = [];
  const groupMismatch = [];

  for (const operation of registryOperations) {
    const authorityOperation = authorityByOperationCode.get(operation.operationCode);
    if (!authorityOperation) {
      continue;
    }

    if (
      permissionListKey(operation.requiredPermissions) !==
      permissionListKey(authorityOperation.requiredPermissions)
    ) {
      permissionMismatch.push(
        `${operation.operationCode}: registry permissions do not match authority snapshot`
      );
    }

    if (
      operation.scopeType !== authorityOperation.scopeType ||
      operation.scopeSource !== authorityOperation.scopeSource
    ) {
      scopeMismatch.push(
        `${operation.operationCode}: registry scope does not match authority snapshot`
      );
    }

    if (operation.exposure !== authorityOperation.exposure) {
      exposureMismatch.push(
        `${operation.operationCode}: registry exposure does not match authority snapshot`
      );
    }

    if (operation.authMode !== authorityOperation.authMode) {
      authMismatch.push(
        `${operation.operationCode}: registry authMode does not match authority snapshot`
      );
    }

    if (operation.documentGroup !== authorityOperation.documentGroup) {
      groupMismatch.push(
        `${operation.operationCode}: registry documentGroup does not match authority snapshot`
      );
    }
  }

  return {
    permissionMismatch,
    scopeMismatch,
    exposureMismatch,
    authMismatch,
    groupMismatch,
  };
}

export function deriveGatewayPolicy(operation) {
  const method = operation.method.toUpperCase();

  if (operation.authMode === 'public' && operation.exposure === 'public') {
    if (READONLY_GATEWAY_METHODS.has(method)) {
      return {
        authPolicyRefs: ['public-readonly'],
        rateLimitHints: ['public-readonly-default'],
      };
    }

    return {
      authPolicyRefs: ['public-submit', 'abuse-protection'],
      rateLimitHints: ['public-submit-default'],
    };
  }

  if (operation.authMode === 'public') {
    return {
      authPolicyRefs: ['public-auth-flow', 'auth-rate-limit'],
      rateLimitHints: ['auth-flow-default'],
    };
  }

  return {
    authPolicyRefs:
      operation.requiredPermissions?.length > 0 ? ['tcrn-jwt', 'tcrn-rbac'] : ['tcrn-jwt'],
    rateLimitHints: [operation.exposure === 'ac_only' ? 'ac-platform-default' : 'tenant-default'],
  };
}

export function validateGatewayManifestRoutes(routes, registryOperations) {
  const operationsByCode = new Map(
    registryOperations.map((operation) => [operation.operationCode, operation])
  );
  const policyViolations = [];

  for (const route of routes) {
    const operation = operationsByCode.get(route.operationCode);
    const method = route.method.toUpperCase();

    if (
      route.authPolicyRefs.includes('public-readonly') &&
      (!READONLY_GATEWAY_METHODS.has(method) || operation?.exposure !== 'public')
    ) {
      policyViolations.push(
        `${route.operationCode}: public-readonly policy is only valid for public GET/HEAD routes`
      );
    }

    if (
      operation?.exposure !== 'public' &&
      route.rateLimitHints.some((hint) => hint.startsWith('public-'))
    ) {
      policyViolations.push(
        `${route.operationCode}: non-public route cannot use public rate-limit hints`
      );
    }
  }

  return policyViolations;
}

function findAuthoritySnapshot() {
  if (existsSync(AUTHORITY_SNAPSHOT_PATH)) {
    return {
      kind: 'tcrn_api_registry_authority_snapshot',
      sourcePath: path.relative(productRoot, AUTHORITY_SNAPSHOT_PATH),
      document: readJson(AUTHORITY_SNAPSHOT_PATH),
    };
  }

  if (existsSync(SOURCE_SNAPSHOT_PATH)) {
    return {
      kind: 'tcrn_api_registry_source_snapshot',
      sourcePath: path.relative(productRoot, SOURCE_SNAPSHOT_PATH),
      document: readJson(SOURCE_SNAPSHOT_PATH),
    };
  }

  return null;
}

function loadAuthorityIndex() {
  const snapshot = findAuthoritySnapshot();
  const operations = snapshot?.document.operations ?? [];
  const byKey = new Map();
  const byRoute = new Map();
  const byOperationId = new Map();
  const byOperationCode = new Map();

  for (const operation of operations) {
    byKey.set(operationKey(operation), operation);
    byRoute.set(`${operation.method} ${operation.pathTemplate}`, operation);
    if (operation.source?.operationId) {
      byOperationId.set(operation.source.operationId, operation);
    }
    byOperationCode.set(operation.operationCode, operation);
  }

  return {
    kind: snapshot?.kind ?? 'missing',
    sourcePath: snapshot?.sourcePath ?? 'missing',
    byKey,
    byRoute,
    byOperationId,
    byOperationCode,
  };
}

function authorityForSwaggerOperation(authority, swaggerOperation) {
  const key = operationKeyForParts(
    swaggerOperation.documentGroup,
    swaggerOperation.method,
    swaggerOperation.normalizedPath
  );
  return (
    authority.byKey.get(key) ??
    (swaggerOperation.operationId ? authority.byOperationId.get(swaggerOperation.operationId) : null) ??
    authority.byOperationCode.get(operationCodeFor(swaggerOperation)) ??
    null
  );
}

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).flatMap((entry) => {
    if (['node_modules', '.next', 'dist', '.turbo', 'coverage'].includes(entry)) {
      return [];
    }

    const full = path.join(dir, entry);

    try {
      return statSync(full).isDirectory() ? listFiles(full) : [full];
    } catch {
      return [];
    }
  });
}

function parseArgLiteral(raw) {
  if (!raw) {
    return '';
  }

  const inner = raw.trim().replace(/^\(/, '').replace(/\)$/, '').trim();
  const quoted = inner.match(/^[`'"]([^`'"]*)[`'"]/);
  return quoted ? quoted[1] : '';
}

function normalizeControllerRoute(pathPart) {
  return pathPart
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');
}

function normalizeOpenApiPath(pathName) {
  return pathName.replace(/^\/api\/v1/, '') || '/';
}

function parseControllerFile(file) {
  const text = readFileSync(file, 'utf8');
  const rel = path.relative(productRoot, file);
  const className =
    text.match(/@Controller\([^)]*\)[\s\S]*?export\s+class\s+([A-Za-z0-9_]+)/)?.[1] ??
    text.match(/@Controller\([^)]*\)[\s\S]*?class\s+([A-Za-z0-9_]+)/)?.[1] ??
    text.match(/export\s+class\s+([A-Za-z0-9_]+)/)?.[1] ??
    text.match(/class\s+([A-Za-z0-9_]+)/)?.[1] ??
    path.basename(file, '.ts');
  const tag = text.match(/@ApiTags\(([^)]*)\)/)?.[1]?.match(/['"`]([^'"`]+)['"`]/)?.[1] ?? null;
  const controllerPath = parseArgLiteral(
    text.match(/@Controller\(([^)]*)\)/)?.[0]?.replace('@Controller', '')
  );
  const excluded = text.includes('@ApiExcludeController');
  const classDecoratorBlock =
    text.match(
      new RegExp(`((?:\\s*@(?:[A-Za-z0-9_]+)(?:\\([^)]*\\))?\\s*)+)(?:export\\s+)?class\\s+${className}\\b`)
    )?.[1] ?? '';
  const isClassPublic = /@Public\(\)/.test(classDecoratorBlock);
  const handlers = [];
  const lines = text.split(/\r?\n/);
  let decorators = [];
  let multiDecorator = '';
  let multiStart = 0;
  let parenDepth = 0;
  let activeClassName = className;
  let activeControllerPath = controllerPath;
  let activeTag = tag;
  let activeExcluded = excluded;
  let activeClassPublic = isClassPublic;

  const flushDecorator = (lineNumber, value) => {
    decorators.push({ line: lineNumber, text: value.replace(/\s+/g, ' ').trim() });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (trimmed.startsWith('@')) {
      if (!multiDecorator) {
        multiStart = index + 1;
      }
      multiDecorator += `${trimmed} `;
      parenDepth += (trimmed.match(/\(/g) ?? []).length - (trimmed.match(/\)/g) ?? []).length;
      if (parenDepth <= 0) {
        flushDecorator(multiStart, multiDecorator);
        multiDecorator = '';
        parenDepth = 0;
      }
      continue;
    }

    if (multiDecorator) {
      multiDecorator += `${trimmed} `;
      parenDepth += (trimmed.match(/\(/g) ?? []).length - (trimmed.match(/\)/g) ?? []).length;
      if (parenDepth <= 0) {
        flushDecorator(multiStart, multiDecorator);
        multiDecorator = '';
        parenDepth = 0;
      }
      continue;
    }

    const classMatch = trimmed.match(/^(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      const decoratorText = decorators.map((decorator) => decorator.text).join('\n');
      const controllerDecorator = decorators.find((decorator) =>
        /@Controller\b/.test(decorator.text)
      );
      const tagDecorator = decorators.find((decorator) => /@ApiTags\b/.test(decorator.text));

      activeClassName = classMatch[1];
      activeControllerPath = controllerDecorator
        ? parseArgLiteral(controllerDecorator.text.replace('@Controller', ''))
        : activeControllerPath;
      activeTag =
        tagDecorator?.text.match(/@ApiTags\(([^)]*)\)/)?.[1]?.match(/['"`]([^'"`]+)['"`]/)?.[1] ??
        activeTag;
      activeExcluded = decoratorText.includes('@ApiExcludeController');
      activeClassPublic = decoratorText.includes('@Public()');
      decorators = [];
      continue;
    }

    const methodMatch = trimmed.match(/^(?:async\s+)?([A-Za-z0-9_]+)\s*\(/);
    if (!methodMatch) {
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        decorators = [];
      }
      continue;
    }

    const routeDecorator = decorators.find((decorator) =>
      /@(Get|Post|Put|Patch|Delete)\b/.test(decorator.text)
    );

    if (!routeDecorator) {
      decorators = [];
      continue;
    }

    const decoratorText = decorators.map((decorator) => decorator.text).join('\n');
    const http =
      routeDecorator.text.match(/@(Get|Post|Put|Patch|Delete)\b/)?.[1]?.toUpperCase() ?? 'GET';
    const methodPath = parseArgLiteral(
      routeDecorator.text.replace(/^@(Get|Post|Put|Patch|Delete)/, '')
    );
    const pathTemplate =
      `/${normalizeControllerRoute([activeControllerPath, methodPath].filter(Boolean).join('/'))}`.replace(
        /\/+/g,
        '/'
      );
    const requiredPermissions = [
      ...decoratorText.matchAll(/RequirePermissions\(([^)]*)\)/g),
    ].flatMap((match) =>
      [
        ...match[1].matchAll(
          /resource:\s*['"`]([^'"`]+)['"`][\s\S]*?action:\s*['"`]([^'"`]+)['"`]/g
        ),
      ].map((permission) => ({
        resource: permission[1],
        action: permission[2],
      }))
    );
    const dynamicPermissionResolver = decoratorText.includes('RequireResolvedPermissions');
    const operationMetadata = decoratorText.includes('TcrnApiOperation')
      ? 'tcrn_decorator_present'
      : 'generated_from_controller_and_openapi';

    handlers.push({
      file: rel,
      line: routeDecorator.line,
      className: activeClassName,
      handlerName: methodMatch[1],
      method: http,
      pathTemplate,
      tag: activeTag,
      controllerPath: activeControllerPath,
      isPublic: activeClassPublic || decoratorText.includes('@Public()'),
      excluded: activeExcluded,
      hasApiOperation:
        decoratorText.includes('@ApiOperation') || decoratorText.includes('TcrnApiOperation'),
      hasApiResponse:
        /@Api(Ok|Created|NoContent|BadRequest|Unauthorized|Forbidden|NotFound|Conflict|Response)\b/.test(
          decoratorText
        ),
      requiredPermissions,
      dynamicPermissionResolver,
      operationMetadata,
    });
    decorators = [];
  }

  return {
    file: rel,
    className,
    tag,
    controllerPath,
    excluded,
    isClassPublic,
    handlers,
  };
}

export function scanControllerInventory() {
  const authority = loadAuthorityIndex();
  const files = [
    path.join(apiRoot, 'src/app.controller.ts'),
    ...listFiles(path.join(apiRoot, 'src/modules')),
  ]
    .filter((file) => file.endsWith('.controller.ts'))
    .sort();
  const controllers = files.map(parseControllerFile);
  const handlers = controllers.flatMap((controller) =>
    controller.handlers.map((handler) => {
      const operationId = `${handler.className}_${handler.handlerName}`;
      const authorityOperation =
        authority.byOperationId.get(operationId) ??
        authority.byRoute.get(`${handler.method} ${handler.pathTemplate}`);
      const operationMetadata =
        handler.operationMetadata === 'tcrn_decorator_present'
          ? 'tcrn_decorator_present'
          : authorityOperation
            ? authority.kind
            : handler.excluded
              ? 'excluded_controller_not_registered'
              : 'not_in_swagger_document_include';

      return {
        ...handler,
        operationMetadata,
        metadataAuthoritySource: authorityOperation ? authority.sourcePath : null,
      };
    })
  );
  const excludedControllers = controllers
    .filter((controller) => controller.excluded)
    .map((controller) => ({
      file: controller.file,
      className: controller.className,
      reason: 'ApiExcludeController',
    }));

  return {
    generatedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'read_only_source',
    target_scope: 'api_operation_registry',
    controllerCount: controllers.length,
    handlerCount: handlers.length,
    controllers: controllers.map(({ handlers: _handlers, ...controller }) => controller),
    handlers,
    unsupportedDynamicCases: {
      missingApiOperation: handlers.filter((handler) => !handler.hasApiOperation),
      missingApiResponse: handlers.filter((handler) => !handler.hasApiResponse),
      dynamicPermissionRoutes: handlers.filter((handler) => handler.dynamicPermissionResolver),
      excludedControllers,
    },
    passed: true,
  };
}

function findSourceForOperationId(operationId) {
  if (!operationId || !operationId.includes('_')) {
    return null;
  }

  const [controllerName, ...handlerParts] = operationId.split('_');
  const handlerName = handlerParts.join('_');
  const files = [
    path.join(apiRoot, 'src/app.controller.ts'),
    ...listFiles(path.join(apiRoot, 'src/modules')),
  ]
    .filter((file) => file.endsWith('.controller.ts'))
    .sort();

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (!new RegExp(`class\\s+${controllerName}\\b`).test(text)) {
      continue;
    }

    const lines = text.split(/\r?\n/);
    const handlerLineIndex = lines.findIndex((line) =>
      new RegExp(`\\b${handlerName}\\s*\\(`).test(line)
    );

    if (handlerLineIndex >= 0) {
      return {
        file: path.relative(productRoot, file),
        line: handlerLineIndex + 1,
        className: controllerName,
        handlerName,
      };
    }
  }

  return null;
}

export function exportOpenApiDocs(outDir) {
  const result = spawnSync(
    'pnpm',
    [
      '--dir',
      apiRoot,
      'exec',
      'ts-node',
      'scripts/api-registry-openapi-export.ts',
      '--out-dir',
      outDir,
    ],
    {
      cwd: productRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? 'test',
      },
    }
  );

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'OpenAPI export failed');
  }
}

export function readOpenApiGroups(openapiDir) {
  return Object.fromEntries(
    Object.entries(DOCUMENT_GROUP_FILES).map(([group, file]) => [
      group,
      readJson(path.join(openapiDir, file)),
    ])
  );
}

function classifyRedaction(text) {
  const lower = text.toLowerCase();
  const hits = [
    'password',
    'secret',
    'token',
    'api_key',
    'access_token',
    'id_token',
    'private_key',
    'email',
    'phone',
  ].filter((needle) => lower.includes(needle));

  if (hits.some((hit) => ['access_token', 'id_token', 'private_key', 'password'].includes(hit))) {
    return { class: 'review_required', hits };
  }

  if (hits.length > 0) {
    return { class: 'possible_sensitive_reference', hits };
  }

  return { class: 'no_sensitive_term_detected', hits: [] };
}

export function collectSwaggerOperations(openapiDir) {
  const docs = readOpenApiGroups(openapiDir);
  const operations = [];
  const summaries = {};

  for (const [documentGroup, document] of Object.entries(docs)) {
    const fileName = DOCUMENT_GROUP_FILES[documentGroup];
    summaries[documentGroup] = {
      file: path.join('openapi-before', fileName),
      title: document.info?.title ?? documentGroup,
      pathCount: Object.keys(document.paths ?? {}).length,
      schemaCount: Object.keys(document.components?.schemas ?? {}).length,
      tagNames: (document.tags ?? []).map((tag) => tag.name),
    };

    for (const [pathName, pathItem] of Object.entries(document.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
        const operation = pathItem?.[method];
        if (!operation) {
          continue;
        }

        operations.push({
          documentGroup,
          openapiFile: path.join('openapi-before', fileName),
          method: method.toUpperCase(),
          path: pathName,
          normalizedPath: normalizeOpenApiPath(pathName),
          operationId: operation.operationId ?? null,
          summary: operation.summary ?? null,
          description: operation.description ?? null,
          tags: operation.tags ?? [],
          responseStatuses: Object.keys(operation.responses ?? {}).sort(),
          requestBodySchemaRefs: collectRequestSchemaRefs(operation),
          responseSchemaRefs: collectResponseSchemaRefs(operation),
          security: operation.security ?? [],
          redactionClassification: classifyRedaction(JSON.stringify(operation)),
        });
      }
    }
  }

  operations.sort((left, right) =>
    `${left.documentGroup} ${left.method} ${left.path}`.localeCompare(
      `${right.documentGroup} ${right.method} ${right.path}`
    )
  );

  return { docs: summaries, operations };
}

export function writeSwaggerInventory(openapiDir) {
  const { docs, operations } = collectSwaggerOperations(openapiDir);
  return {
    generatedAt: new Date().toISOString(),
    test_layer: 'swagger_export',
    data_mode: 'read_only_generated_doc',
    target_scope: 'swagger_group',
    docs,
    operationCount: operations.length,
    operations,
    unsupportedDynamicCases: {
      missingOperationId: operations.filter((operation) => !operation.operationId),
      possibleSensitiveReferences: operations.filter(
        (operation) => operation.redactionClassification.class !== 'no_sensitive_term_detected'
      ),
    },
    passed: true,
  };
}

function ownerForOperation(operation) {
  const haystack = `${operation.tags.join(' ')} ${operation.path} ${operation.summary ?? ''}`;
  const match = TAG_OWNERS.find(([pattern]) => pattern.test(haystack));
  const [ownerModuleCode, ownerCapabilityCode] = match?.[1] ?? ['core', 'core.settings'];
  return { ownerModuleCode, ownerCapabilityCode };
}

function classifyScope(operation) {
  const pathName = operation.normalizedPath;

  if (
    operation.documentGroup === 'public' ||
    operation.tags.some((tag) => tag.startsWith('Public'))
  ) {
    return { scopeType: 'public', scopeSource: 'public swagger group or public tag' };
  }

  if (/\{talentId\}/.test(pathName)) {
    return { scopeType: 'talent', scopeSource: 'path parameter talentId' };
  }

  if (/\{subsidiaryId\}/.test(pathName)) {
    return { scopeType: 'subsidiary', scopeSource: 'path parameter subsidiaryId' };
  }

  if (
    /api-registry|platform-tools|runtime-flags|event-backbone|observability\/adapters|\/tenants\b|system-users|system-roles|delegated-admins/.test(
      pathName
    )
  ) {
    return { scopeType: 'ac_platform', scopeSource: 'AC/platform route family' };
  }

  return { scopeType: 'tenant', scopeSource: 'default authenticated tenant scope' };
}

function classifyExposure(operation, scopeType) {
  if (scopeType === 'public') {
    return 'public';
  }

  if (scopeType === 'ac_platform') {
    return 'ac_only';
  }

  if (operation.documentGroup === 'config') {
    return 'internal';
  }

  return 'tenant_private';
}

function classifyPii(operation) {
  const haystack =
    `${operation.path} ${operation.tags.join(' ')} ${operation.summary ?? ''}`.toLowerCase();

  if (/secret|password|token|api-key|consumer-key|sso|config/.test(haystack)) {
    return 'secret_reference';
  }

  if (/customer|pii|profile|email|phone|report|import|export/.test(haystack)) {
    return 'customer_pii';
  }

  if (/tenant|user|role|permission|domain/.test(haystack)) {
    return 'reference';
  }

  return 'none';
}

function operationCodeFor(operation) {
  const raw =
    operation.operationId ??
    `${operation.method}_${operation.normalizedPath.replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}`;
  return `${operation.documentGroup}.${raw}`
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function buildLinks(operations, key, valueFactory) {
  const links = {};

  for (const operation of operations) {
    const code = operation[key];
    if (!links[code]) {
      links[code] = valueFactory(operation);
    }
    links[code].operationCount += 1;
  }

  return links;
}

export function buildRegistryDocument(openapiDir) {
  const sourceCommit = runGit(['rev-parse', 'HEAD']);
  const authority = loadAuthorityIndex();
  const swaggerInventory = writeSwaggerInventory(openapiDir);
  const controllerInventory = scanControllerInventory();
  const handlersByOperationId = new Map(
    controllerInventory.handlers.map((handler) => [
      `${handler.className}_${handler.handlerName}`,
      handler,
    ])
  );
  const operations = swaggerInventory.operations.map((operation) => {
    const handler = operation.operationId ? handlersByOperationId.get(operation.operationId) : null;
    const sourceFallback = handler ? null : findSourceForOperationId(operation.operationId);
    const authorityOperation = authorityForSwaggerOperation(authority, operation);
    const inferredOwner = ownerForOperation(operation);
    const inferredScope = classifyScope(operation);
    const scopeType = authorityOperation?.scopeType ?? inferredScope.scopeType;
    const scopeSource = authorityOperation?.scopeSource ?? inferredScope.scopeSource;
    const exposure =
      authorityOperation?.exposure ?? classifyExposure(operation, inferredScope.scopeType);
    const stability =
      authorityOperation?.stability ??
      (/^retired|retired:/i.test(operation.summary ?? '') ? 'deprecated' : 'stable');
    const responseSchemaRefs = uniqueSorted(operation.responseSchemaRefs);
    const requestSchemaRefs = uniqueSorted(operation.requestBodySchemaRefs);
    const requiredPermissions = normalizePermissionList(
      handler?.requiredPermissions ?? authorityOperation?.requiredPermissions ?? []
    );
    const hasSwaggerSecurity = (operation.security ?? []).some(
      (security) => Object.keys(security ?? {}).length > 0
    );
    const isPublicOperation =
      (handler?.isPublic === true || (!handler && !hasSwaggerSecurity && exposure === 'public')) &&
      requiredPermissions.length === 0;
    const authMode = authorityOperation?.authMode ?? (isPublicOperation ? 'public' : 'bearer_jwt');

    return {
      operationCode: operationCodeFor(operation),
      method: operation.method,
      pathTemplate: operation.normalizedPath,
      documentGroup: operation.documentGroup,
      tag: operation.tags[0] ?? 'Unclassified',
      summary:
        operation.summary ??
        operation.operationId ??
        `${operation.method} ${operation.normalizedPath}`,
      description: operation.description,
      ownerModuleCode: authorityOperation?.ownerModuleCode ?? inferredOwner.ownerModuleCode,
      ownerCapabilityCode:
        authorityOperation?.ownerCapabilityCode ?? inferredOwner.ownerCapabilityCode,
      controllerName:
        handler?.className ??
        sourceFallback?.className ??
        operation.operationId?.split('_')[0] ??
        'UnknownController',
      handlerName:
        handler?.handlerName ??
        sourceFallback?.handlerName ??
        operation.operationId?.split('_').slice(1).join('_') ??
        'unknownHandler',
      requestSchemaRef: requestSchemaRefs[0] ?? null,
      responseSchemaRefs,
      authMode,
      requiredPermissions,
      dynamicPermissionResolver: {
        enabled: Boolean(handler?.dynamicPermissionResolver),
        resolverName: handler?.dynamicPermissionResolver
          ? `${handler.className}.${handler.handlerName}`
          : null,
        source: handler?.dynamicPermissionResolver ? handler.file : null,
        runtimeProofRequired: Boolean(handler?.dynamicPermissionResolver),
      },
      scopeType,
      scopeSource,
      exposure,
      stability,
      deprecation: {
        isDeprecated: authorityOperation?.deprecation?.isDeprecated ?? stability === 'deprecated',
        reason:
          authorityOperation?.deprecation?.reason ??
          (stability === 'deprecated' ? 'retired route retained for compatibility' : null),
        replacementOperationCode: authorityOperation?.deprecation?.replacementOperationCode ?? null,
        sunsetAt: authorityOperation?.deprecation?.sunsetAt ?? null,
      },
      piiClass: authorityOperation?.piiClass ?? classifyPii(operation),
      examplePolicy:
        authorityOperation?.examplePolicy ??
        (exposure === 'public' ? 'public_safe_examples_only' : 'no_raw_secret_or_pii'),
      gatewayEligible:
        authorityOperation?.gatewayEligible ?? (exposure !== 'ac_only' && stability !== 'deprecated'),
      builderExportEligible:
        authorityOperation?.builderExportEligible ??
        (exposure !== 'ac_only' && operation.documentGroup !== 'config'),
      auditEventTypes: authorityOperation?.auditEventTypes ?? [],
      metadataAuthority: {
        kind:
          handler?.operationMetadata === 'tcrn_decorator_present'
            ? 'tcrn_api_operation_decorator'
            : authorityOperation
              ? authority.kind
              : 'missing',
        source:
          handler?.operationMetadata === 'tcrn_decorator_present'
            ? handler.file
            : authorityOperation
              ? authority.sourcePath
              : 'missing',
        operationKey: operationKeyForParts(
          operation.documentGroup,
          operation.method,
          operation.normalizedPath
        ),
      },
      source: {
        openapiFile: operation.openapiFile,
        operationId: operation.operationId,
        controllerFile: handler?.file ?? sourceFallback?.file ?? null,
        controllerLine: handler?.line ?? sourceFallback?.line ?? null,
      },
    };
  });
  const groups = Object.fromEntries(
    Object.entries(swaggerInventory.docs).map(([group, doc]) => [
      group,
      {
        title: doc.title,
        operationCount: operations.filter((operation) => operation.documentGroup === group).length,
        pathCount: doc.pathCount,
        schemaCount: doc.schemaCount,
      },
    ])
  );
  const rbacLinks = {};
  const schemaLinks = {};

  for (const operation of operations) {
    for (const permission of operation.requiredPermissions) {
      if (!rbacLinks[permission.resource]) {
        rbacLinks[permission.resource] = { actions: [], operationCount: 0 };
      }
      rbacLinks[permission.resource].operationCount += 1;
      rbacLinks[permission.resource].actions = [
        ...new Set([...rbacLinks[permission.resource].actions, permission.action]),
      ].sort();
    }

    for (const schemaRef of [operation.requestSchemaRef, ...operation.responseSchemaRefs].filter(
      Boolean
    )) {
      if (!schemaLinks[schemaRef]) {
        schemaLinks[schemaRef] = { operationCount: 0 };
      }
      schemaLinks[schemaRef].operationCount += 1;
    }
  }

  return {
    registryVersion: API_REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),
    sourceCommit,
    operations,
    groups,
    moduleLinks: buildLinks(operations, 'ownerModuleCode', (operation) => ({
      operationCount: 0,
      documentationGroup: operation.ownerModuleCode,
    })),
    capabilityLinks: buildLinks(operations, 'ownerCapabilityCode', (operation) => ({
      operationCount: 0,
      moduleCode: operation.ownerModuleCode,
    })),
    rbacLinks,
    schemaLinks,
    warnings: [],
  };
}

export function writeSourceSnapshot(document) {
  const out = SOURCE_SNAPSHOT_PATH;
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  writeFileSync(
    AUTHORITY_SNAPSHOT_PATH,
    `${JSON.stringify(
      {
        authorityVersion: API_REGISTRY_VERSION,
        generatedAt: document.generatedAt,
        sourceCommit: document.sourceCommit,
        sourceDocument: path.relative(productRoot, out),
        operations: document.operations.map((operation) => ({
          operationCode: operation.operationCode,
          method: operation.method,
          pathTemplate: operation.pathTemplate,
          documentGroup: operation.documentGroup,
          ownerModuleCode: operation.ownerModuleCode,
          ownerCapabilityCode: operation.ownerCapabilityCode,
          authMode: operation.authMode,
          requiredPermissions: operation.requiredPermissions,
          scopeType: operation.scopeType,
          scopeSource: operation.scopeSource,
          exposure: operation.exposure,
          stability: operation.stability,
          deprecation: operation.deprecation,
          piiClass: operation.piiClass,
          examplePolicy: operation.examplePolicy,
          gatewayEligible: operation.gatewayEligible,
          builderExportEligible: operation.builderExportEligible,
          auditEventTypes: operation.auditEventTypes,
          source: operation.source,
        })),
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  return out;
}

export function writeRuntimeDriftReport(report) {
  mkdirSync(path.dirname(RUNTIME_DRIFT_REPORT_PATH), { recursive: true });
  writeFileSync(RUNTIME_DRIFT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return RUNTIME_DRIFT_REPORT_PATH;
}

export function verifyRegistryDrift(registry, openapiDir) {
  const swaggerInventory = writeSwaggerInventory(openapiDir);
  const controllerInventory = scanControllerInventory();
  const authority = loadAuthorityIndex();
  const authorityOperations = [...authority.byOperationCode.values()];
  const swaggerByKey = new Map(
    swaggerInventory.operations.map((operation) => [
      operationKeyForParts(operation.documentGroup, operation.method, operation.normalizedPath),
      operation,
    ])
  );
  const handlersByOperationId = new Map(
    controllerInventory.handlers.map((handler) => [
      `${handler.className}_${handler.handlerName}`,
      handler,
    ])
  );
  const registryKeys = new Set(
    registry.operations.map(
      (operation) => `${operation.documentGroup} ${operation.method} ${operation.pathTemplate}`
    )
  );
  const swaggerKeys = new Set(
    swaggerInventory.operations.map(
      (operation) => `${operation.documentGroup} ${operation.method} ${operation.normalizedPath}`
    )
  );
  const controllerOperationIds = new Set([
    ...controllerInventory.handlers.map((handler) => `${handler.className}_${handler.handlerName}`),
    ...registry.operations
      .filter((operation) => operation.source.controllerFile)
      .map((operation) => operation.source.operationId),
  ]);
  const missingRegistry = [...swaggerKeys].filter((key) => !registryKeys.has(key));
  const missingSwagger = [...registryKeys].filter((key) => !swaggerKeys.has(key));
  const missingController = registry.operations
    .filter(
      (operation) =>
        operation.source.operationId && !controllerOperationIds.has(operation.source.operationId)
    )
    .map((operation) => operation.operationCode);
  const unclassifiedDynamicPermission = registry.operations
    .filter(
      (operation) =>
        operation.dynamicPermissionResolver.enabled &&
        (!operation.dynamicPermissionResolver.resolverName ||
          !operation.dynamicPermissionResolver.source ||
          !operation.dynamicPermissionResolver.runtimeProofRequired)
    )
    .map((operation) => operation.operationCode);
  const metadataAuthorityMismatch = registry.operations
    .filter(
      (operation) =>
        !operation.metadataAuthority ||
        operation.metadataAuthority.kind === 'missing' ||
        !operation.metadataAuthority.source ||
        !operation.metadataAuthority.operationKey
    )
    .map((operation) => operation.operationCode);
  if (authority.kind === 'missing') {
    metadataAuthorityMismatch.push('api-registry authority snapshot missing');
  }
  for (const operation of registry.operations) {
    if (!authority.byOperationCode.has(operation.operationCode)) {
      metadataAuthorityMismatch.push(
        `${operation.operationCode}: missing from authority snapshot`
      );
    }
  }
  const authorityComparison = compareRegistryAuthority(registry.operations, authorityOperations);
  const permissionMismatch = [];
  const schemaMismatch = [];
  const groupMismatch = [...authorityComparison.groupMismatch];
  const exposureMismatch = [...authorityComparison.exposureMismatch];
  const authMismatch = [...authorityComparison.authMismatch];
  const scopeMismatch = [...authorityComparison.scopeMismatch];
  permissionMismatch.push(...authorityComparison.permissionMismatch);

  for (const operation of registry.operations) {
    const key = operationKey(operation);
    const swaggerOperation = swaggerByKey.get(key);
    const handler = operation.source.operationId
      ? handlersByOperationId.get(operation.source.operationId)
      : null;

    if (swaggerOperation) {
      const expectedRequestSchemaRef = swaggerOperation.requestBodySchemaRefs[0] ?? null;
      const expectedResponseSchemaRefs = uniqueSorted(swaggerOperation.responseSchemaRefs);
      if (
        operation.requestSchemaRef !== expectedRequestSchemaRef ||
        JSON.stringify(uniqueSorted(operation.responseSchemaRefs)) !==
          JSON.stringify(expectedResponseSchemaRefs)
      ) {
        schemaMismatch.push(
          `${operation.operationCode}: registry schema refs do not match generated OpenAPI`
        );
      }

      if (operation.source.openapiFile !== swaggerOperation.openapiFile) {
        groupMismatch.push(
          `${operation.operationCode}: registry source ${operation.source.openapiFile} does not match ${swaggerOperation.openapiFile}`
        );
      }
    }

    if (
      handler &&
      permissionListKey(operation.requiredPermissions) !==
        permissionListKey(handler.requiredPermissions)
    ) {
      permissionMismatch.push(
        `${operation.operationCode}: registry permissions do not match controller RequirePermissions metadata`
      );
    }

    if (operation.authMode === 'public' && operation.requiredPermissions.length > 0) {
      exposureMismatch.push(
        `${operation.operationCode}: public authMode cannot require RBAC permissions`
      );
    }

    if (handler && !handler.isPublic && operation.authMode === 'public') {
      exposureMismatch.push(
        `${operation.operationCode}: non-public controller handler is marked public`
      );
    }

    if (operation.exposure === 'ac_only' && operation.scopeType !== 'ac_platform') {
      scopeMismatch.push(`${operation.operationCode}: ac_only exposure must use ac_platform scope`);
    }

    if (operation.exposure === 'ac_only' && operation.authMode === 'public') {
      exposureMismatch.push(`${operation.operationCode}: ac_only operation cannot be public auth`);
    }
  }

  const manualOpenApiArtifacts = listFiles(productRoot).filter((file) =>
    /(^|\/)openapi\.(ya?ml|json)$/.test(path.relative(productRoot, file))
  );
  const result =
    missingRegistry.length === 0 &&
    missingSwagger.length === 0 &&
    missingController.length === 0 &&
    permissionMismatch.length === 0 &&
    scopeMismatch.length === 0 &&
    schemaMismatch.length === 0 &&
    groupMismatch.length === 0 &&
    exposureMismatch.length === 0 &&
    authMismatch.length === 0 &&
    metadataAuthorityMismatch.length === 0 &&
    unclassifiedDynamicPermission.length === 0 &&
    manualOpenApiArtifacts.length === 0
      ? 'pass'
      : 'fail';

  return {
    checkedAt: new Date().toISOString(),
    sourceCommit: runGit(['rev-parse', 'HEAD']),
    missingRegistry,
    missingController,
    missingSwagger,
    permissionMismatch,
    scopeMismatch,
    schemaMismatch,
    groupMismatch,
    exposureMismatch,
    authMismatch,
    metadataAuthorityMismatch,
    unclassifiedDynamicPermission,
    manualOpenApiArtifacts: manualOpenApiArtifacts.map((file) => path.relative(productRoot, file)),
    excludedControllers: controllerInventory.unsupportedDynamicCases.excludedControllers,
    result,
  };
}

export function buildSwaggerExposurePolicy() {
  const configText = readFileSync(path.join(apiRoot, 'src/config/swagger.config.ts'), 'utf8');
  const productionPersistAuthDisabled =
    configText.includes("persistAuthorizationPolicy: prodLike ? 'disabled' : 'local_only'") &&
    !configText.includes('persistAuthorization: true');

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'source_scan',
    target_scope: 'swagger_group',
    environmentPolicies: ['local', 'test', 'shared_dev', 'staging', 'production'],
    policyEnabled: true,
    enabled: {
      local: true,
      test: true,
      shared_dev: false,
      staging: false,
      production: false,
    },
    enabledEvidence: {
      local: 'enabled_without_auth_for_local_development',
      test: 'enabled_without_auth_for_contract_tests',
      shared_dev: 'disabled_until_basic_auth_credentials_configured',
      staging: 'disabled_until_basic_auth_credentials_configured',
      production: 'disabled_until_basic_auth_credentials_configured',
    },
    authRequirement: {
      local: 'none_local_only',
      test: 'none_local_only',
      shared_dev: 'basic_auth_required',
      staging: 'basic_auth_required',
      production: 'basic_auth_required',
    },
    tryOutMode: {
      local: 'local_enabled',
      prodLike: 'read_only_or_disabled_for_private_mutations',
    },
    allowedGroups: ['operations', 'config', 'public'],
    publicGroupPolicy: 'public_safe_only',
    privateGroupPolicy: 'auth_required',
    acOnlySchemaPolicy: 'never_public',
    redactionPolicy: 'no_raw_secret_or_pii_examples',
    basicAuthFallback: 'production_supported',
    prodLikeDefaultAvailability: 'fail_closed_without_basic_auth_credentials',
    ssoFutureHook: 'reserved_not_active',
    persistAuthorizationPolicy: productionPersistAuthDisabled ? 'prod_like_disabled' : 'unsafe',
    oauthHelperPolicy: 'metadata_only_no_secret',
    browserStorageCleanupPolicy: 'clear_after_shared_or_prod_like_proof',
    evidenceTokenPolicy: 'forbid_tokens_cookies_auth_headers',
    passed: productionPersistAuthDisabled,
  };
}

function isAllowedSecretPlaceholder(value) {
  return /^(secret-ref:|env:|AUTH_[A-Z0-9_]+$|redacted$|masked$|\*\*\*)/i.test(value) ||
    /^tcrn-(?:verify|email-verification)=secret-ref:/i.test(value);
}

function isSensitiveExample(pathParts, value) {
  if (typeof value !== 'string' || value.length === 0 || isAllowedSecretPlaceholder(value)) {
    return false;
  }

  const fieldName = (pathParts[pathParts.length - 1] ?? '').toLowerCase();
  const tokenKey =
    /access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|verification[_-]?token|sso[_-]?token|turnstile[_-]?token|customdomainverificationtoken/i.test(
      fieldName
    ) ||
    /^token$/i.test(fieldName) ||
    /api[_-]?key|secret|password|private[_-]?key|client[_-]?secret/i.test(fieldName);
  const jwtLike = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]{8,})?/.test(
    value
  );
  const longHex = /\b[a-f0-9]{24,}\b/i.test(value);
  const verificationRecord = /tcrn-(?:verify|email-verification)=([A-Za-z0-9._~+/=-]{8,})/i.test(
    value
  );

  if (jwtLike || verificationRecord) {
    return true;
  }

  if (tokenKey && (longHex || /[A-Za-z0-9._~+/=-]{8,}/.test(value))) {
    return true;
  }

  return /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/i.test(value);
}

function collectSensitiveExamples(node, pathParts = []) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const findings = [];

  for (const [key, value] of Object.entries(node)) {
    const nextPath = [...pathParts, key];
    if (key === 'example' && isSensitiveExample(pathParts, value)) {
      findings.push({
        path: pathParts.join('.'),
        classification: 'forbidden_sensitive_example',
        redactedMatch: String(value).slice(0, 18),
      });
      continue;
    }

    if (key === 'examples' && value && typeof value === 'object') {
      for (const exampleValue of Object.values(value)) {
        const rawValue =
          exampleValue && typeof exampleValue === 'object' && 'value' in exampleValue
            ? exampleValue.value
            : exampleValue;
        if (typeof rawValue === 'string' && isSensitiveExample(pathParts, rawValue)) {
          findings.push({
            path: pathParts.join('.'),
            classification: 'forbidden_sensitive_examples_value',
            redactedMatch: rawValue.slice(0, 18),
          });
        }
      }
    }

    findings.push(...collectSensitiveExamples(value, nextPath));
  }

  return findings;
}

export function verifyOpenApiRedaction(openapiDir) {
  const files = Object.values(DOCUMENT_GROUP_FILES).map((file) => path.join(openapiDir, file));
  const hits = [];

  for (const file of files) {
    const document = readJson(file);
    const pathsText = JSON.stringify(document.paths ?? {});
    const componentText = JSON.stringify(document.components ?? {});
    const suspiciousExamples = [
      ...pathsText.matchAll(
        /"example"\s*:\s*"([^"]*(?:Bearer|access_token|private_key|password|client_secret)[^"]*)"/gi
      ),
      ...componentText.matchAll(
        /"example"\s*:\s*"([^"]*(?:Bearer|access_token|private_key|password|client_secret)[^"]*)"/gi
      ),
    ];
    const forbiddenExamples = suspiciousExamples
      .map((match) => match[1])
      .filter(
        (value) =>
          !/^AUTH_[A-Z0-9_]+$/.test(value) &&
          !/^Password\s/i.test(value) &&
          !/^Current password\s/i.test(value) &&
          !/^env:[A-Z0-9_]+$/i.test(value) &&
          !/^secret-ref:[a-z0-9_.:-]+$/i.test(value)
      )
      .map((value) => ({
        file: path.relative(productRoot, file),
        classification: 'forbidden_raw_example',
        redactedMatch: value.slice(0, 16),
      }));
    hits.push(...forbiddenExamples);
    hits.push(
      ...collectSensitiveExamples(document).map((finding) => ({
        file: path.relative(productRoot, file),
        ...finding,
      }))
    );
  }

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'swagger_export',
    target_scope: 'openapi_redaction',
    files: files.map((file) => path.relative(productRoot, file)),
    forbiddenRawExampleHits: hits,
    passed: hits.length === 0,
  };
}

export function buildGatewayManifest(registry) {
  const routes = registry.operations
    .filter((operation) => operation.gatewayEligible)
    .map((operation) => {
      const policy = deriveGatewayPolicy(operation);

      return {
        operationCode: operation.operationCode,
        method: operation.method,
        pathTemplate: operation.pathTemplate,
        upstreamService: 'tcrn-api',
        authPolicyRefs: policy.authPolicyRefs,
        rateLimitHints: policy.rateLimitHints,
        oidcHints: operation.exposure === 'ac_only' ? ['future-ac-sso-hook'] : [],
        canaryEligible: operation.stability !== 'deprecated',
        rollbackNotes: 'Derived dry-run manifest only; Phase 9 never applies gateway config.',
        notAppliedReason: 'phase_9_readiness_only',
      };
    });
  const policyViolations = validateGatewayManifestRoutes(routes, registry.operations);

  return {
    manifestVersion: API_REGISTRY_VERSION,
    generatedFromRegistryVersion: registry.registryVersion,
    routes,
    policyViolations,
    passed: policyViolations.length === 0,
  };
}

export function buildBuilderReadonlyExport(registry) {
  return {
    exportVersion: API_REGISTRY_VERSION,
    generatedFromRegistryVersion: registry.registryVersion,
    mode: 'read_only',
    operations: registry.operations
      .filter((operation) => operation.builderExportEligible)
      .map((operation) => ({
        operationCode: operation.operationCode,
        method: operation.method,
        pathTemplate: operation.pathTemplate,
        documentGroup: operation.documentGroup,
        ownerModuleCode: operation.ownerModuleCode,
        ownerCapabilityCode: operation.ownerCapabilityCode,
        requiredPermissions: operation.requiredPermissions,
        scopeType: operation.scopeType,
        exposure: operation.exposure,
        stability: operation.stability,
        requestSchemaRef: operation.requestSchemaRef,
        responseSchemaRefs: operation.responseSchemaRefs,
      })),
    passed: true,
  };
}

export function verifyNegativeAuthority(sourceRoots) {
  const files = sourceRoots.flatMap((sourceRoot) =>
    listFiles(path.resolve(productRoot, sourceRoot)).filter((file) =>
      /\.(ts|tsx|js|jsx|mjs)$/.test(file)
    )
  );
  const findings = [];

  for (const file of files) {
    const rel = path.relative(productRoot, file);
    const text = readFileSync(file, 'utf8');
    const checks = [
      ['swagger_editor_route', /SwaggerEditor|Swagger Editor|swagger-editor/],
      [
        'gateway_apply_or_cutover',
        /gateway\s+(apply|cutover)|apisix\s+(apply|start)|kong\s+(apply|start)/i,
      ],
      [
        'builder_write_authority',
        /builder.*(write|mutation|direct db|pro-code|marketplace|fireboom)/i,
      ],
    ];

    for (const [rule, pattern] of checks) {
      if (!pattern.test(text)) {
        continue;
      }

      const allowed =
        /api-registry-script-utils\.mjs$/.test(rel) ||
        /(__tests__|\.spec\.|\.test\.)/.test(rel) ||
        (rule === 'swagger_editor_route' &&
          /auth\.dto|verify-sso-browser-proof|export-swagger-evidence/.test(rel)) ||
        (rule === 'gateway_apply_or_cutover' && /platform-tools|api-registry/.test(rel));

      findings.push({
        file: rel,
        rule,
        classification: allowed ? 'allowed_reference_not_authority' : 'forbidden',
      });
    }
  }

  const forbidden = findings.filter((finding) => finding.classification === 'forbidden');

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'api_operation_registry',
    findings,
    forbidden,
    passed: forbidden.length === 0,
  };
}

export function verifyEvidenceRedaction(evidenceDir) {
  const files = listFiles(evidenceDir).filter((file) => /\.(json|txt|md|log)$/.test(file));
  const hits = [];

  for (const file of files) {
    const rel = path.relative(evidenceDir, file);
    const text = readFileSync(file, 'utf8');

    for (const pattern of FORBIDDEN_EVIDENCE_PATTERNS) {
      if (pattern.test(text)) {
        hits.push({ file: rel, classification: 'forbidden_sensitive_evidence_pattern' });
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'security_privacy',
    data_mode: 'security_privacy',
    target_scope: 'openapi_redaction',
    scannedFileCount: files.length,
    forbiddenHits: hits,
    passed: hits.length === 0,
  };
}
