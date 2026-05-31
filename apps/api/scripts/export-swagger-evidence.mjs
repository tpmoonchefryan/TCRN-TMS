// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(scriptDir, 'export-swagger-evidence.ts');
const productRoot = path.resolve(scriptDir, '../../..');
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function writePlatformToolEvidence() {
  const out = readArg('--out', 'platform-tool-swagger-redaction.json');
  const controllerPath = path.join(
    productRoot,
    'apps/api/src/modules/platform-tools/platform-tools.controller.ts'
  );
  const dtoPath = path.join(
    productRoot,
    'apps/api/src/modules/platform-tools/dto/platform-tools.dto.ts'
  );
  const controllerText = readFileSync(controllerPath, 'utf8');
  const dtoText = readFileSync(dtoPath, 'utf8');
  const requiredPaths = [
    '/platform-tools/definitions',
    '/platform-tools/connections',
    '/platform-tools/connections/{toolCode}',
    '/platform-tools/connections/{toolCode}/health-check',
    '/platform-tools/connections/{toolCode}/deep-link',
    '/platform-tools/deployment-boundary',
  ];
  const requiredSourceSnippets = [
    "@Get('definitions')",
    "@Get('connections')",
    "@Get('connections/:toolCode')",
    "@Patch('connections/:toolCode')",
    "@Post('connections/:toolCode/health-check')",
    "@Get('connections/:toolCode/deep-link')",
    "@Get('deployment-boundary')",
  ];
  const missingRequiredPaths = requiredSourceSnippets
    .map((snippet, index) => ({ snippet, path: requiredPaths[index] }))
    .filter((entry) => !controllerText.includes(entry.snippet))
    .map((entry) => entry.path);
  const documentText = `${controllerText}\n${dtoText}`;
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'ac_platform_tool_connection',
    platformToolPaths: requiredPaths.filter((pathName) => !missingRequiredPaths.includes(pathName)),
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    secretReferenceInputOnly:
      documentText.includes('secretRef') && !documentText.includes('secretValue'),
    bearerAuthPresent: controllerText.includes('@ApiBearerAuth()'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      documentText.includes('secretRef') &&
      !documentText.includes('secretValue') &&
      controllerText.includes('@ApiBearerAuth()'),
  };

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

function writeObservabilityEvidence() {
  const out = readArg('--out', 'observability-swagger-redaction.json');
  const controllerPath = path.join(
    productRoot,
    'apps/api/src/modules/observability-adapters/observability-adapters.controller.ts'
  );
  const dtoPath = path.join(
    productRoot,
    'apps/api/src/modules/observability-adapters/dto/observability-adapters.dto.ts'
  );
  const controllerText = readFileSync(controllerPath, 'utf8');
  const dtoText = readFileSync(dtoPath, 'utf8');
  const requiredPaths = [
    '/observability/adapters/definitions',
    '/observability/adapters/policy',
    '/observability/adapters/summary',
    '/observability/adapters/{adapterCode}/deep-link',
  ];
  const requiredSourceSnippets = [
    "@Get('definitions')",
    "@Get('policy')",
    "@Get('summary')",
    "@Get(':adapterCode/deep-link')",
  ];
  const missingRequiredPaths = requiredSourceSnippets
    .map((snippet, index) => ({ snippet, path: requiredPaths[index] }))
    .filter((entry) => !controllerText.includes(entry.snippet))
    .map((entry) => entry.path);
  const documentText = `${controllerText}\n${dtoText}`;
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'observability_adapter_foundation',
    observabilityPaths: requiredPaths.filter(
      (pathName) => !missingRequiredPaths.includes(pathName)
    ),
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: controllerText.includes('@ApiBearerAuth()'),
    acOnlyGuardPresent: controllerText.includes('AC operators only'),
    executePermissionForDeepLink: controllerText.includes("action: 'execute'"),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      controllerText.includes('@ApiBearerAuth()') &&
      controllerText.includes('AC operators only') &&
      controllerText.includes("action: 'execute'"),
  };

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

function writeRuntimeFlagEvidence() {
  const out = readArg('--out', 'runtime-flag-swagger-redaction.json');
  const controllerPath = path.join(
    productRoot,
    'apps/api/src/modules/runtime-flags/runtime-flags.controller.ts'
  );
  const dtoPath = path.join(
    productRoot,
    'apps/api/src/modules/runtime-flags/dto/runtime-flags.dto.ts'
  );
  const controllerText = readFileSync(controllerPath, 'utf8');
  const dtoText = readFileSync(dtoPath, 'utf8');
  const requiredPaths = [
    '/runtime-flags/adapters',
    '/runtime-flags/definitions',
    '/runtime-flags/policy',
    '/runtime-flags/summary',
    '/runtime-flags/provider-readiness',
    '/runtime-flags/evaluate',
    '/runtime-flags/kill-switches',
    '/runtime-flags/kill-switches/{switchId}/deactivate',
  ];
  const requiredSourceSnippets = [
    "@Get('adapters')",
    "@Get('definitions')",
    "@Get('policy')",
    "@Get('summary')",
    "@Get('provider-readiness')",
    "@Post('evaluate')",
    "@Post('kill-switches')",
    "@Patch('kill-switches/:switchId/deactivate')",
  ];
  const missingRequiredPaths = requiredSourceSnippets
    .map((snippet, index) => ({ snippet, path: requiredPaths[index] }))
    .filter((entry) => !controllerText.includes(entry.snippet))
    .map((entry) => entry.path);
  const documentText = `${controllerText}\n${dtoText}`;
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'runtime_flag_definition',
    runtimeFlagPaths: requiredPaths.filter((pathName) => !missingRequiredPaths.includes(pathName)),
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: controllerText.includes('@ApiBearerAuth()'),
    acOnlyGuardPresent: controllerText.includes('AC operators only'),
    runtimeFlagPermissionResourcePresent: controllerText.includes(
      "resource: 'platform.runtime_flag'"
    ),
    executePermissionForEvaluation: controllerText.includes("action: 'execute'"),
    adminPermissionForKillSwitch: controllerText.includes("action: 'admin'"),
    toolConnectionWritePermissionForKillSwitchAbsent: !controllerText.includes(
      "resource: 'platform.tool_connection', action: 'write'"
    ),
    writePermissionForKillSwitchAbsent: !controllerText.includes("action: 'write'"),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      controllerText.includes('@ApiBearerAuth()') &&
      controllerText.includes('AC operators only') &&
      controllerText.includes("resource: 'platform.runtime_flag'") &&
      controllerText.includes("action: 'execute'") &&
      controllerText.includes("action: 'admin'") &&
      !controllerText.includes("resource: 'platform.tool_connection', action: 'write'") &&
      !controllerText.includes("action: 'write'"),
  };

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

function writeWebhookDeliveryEvidence() {
  const out = readArg('--out', 'webhook-delivery-swagger-redaction.json');
  const generated = spawnSync(
    'pnpm',
    [
      '--dir',
      path.join(productRoot, 'apps/api'),
      'exec',
      'ts-node',
      'scripts/export-swagger-evidence.ts',
      '--filter',
      'webhook-delivery',
      '--out',
      out,
    ],
    {
      cwd: productRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (generated.status === 0) {
    process.stdout.write(generated.stdout);
    return;
  }

  process.stderr.write(generated.stderr);
  process.stderr.write(
    '\nGenerated OpenAPI export failed; falling back to source-level route evidence.\n'
  );

  const controllerPath = path.join(
    productRoot,
    'apps/api/src/modules/integration/controllers/integration.controller.ts'
  );
  const dtoPath = path.join(
    productRoot,
    'apps/api/src/modules/integration/dto/integration.dto.ts'
  );
  const controllerText = readFileSync(controllerPath, 'utf8');
  const dtoText = readFileSync(dtoPath, 'utf8');
  const requiredPaths = [
    '/integration/webhooks/events',
    '/integration/webhooks/{webhookId}/delivery-attempts',
    '/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}',
    '/integration/webhooks/{webhookId}/test-delivery',
    '/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}/replay',
  ];
  const requiredSourceSnippets = [
    "@Get('webhooks/events')",
    "@Get('webhooks/:webhookId/delivery-attempts')",
    "@Get('webhooks/:webhookId/delivery-attempts/:attemptId')",
    "@Post('webhooks/:webhookId/test-delivery')",
    "@Post('webhooks/:webhookId/delivery-attempts/:attemptId/replay')",
  ];
  const missingRequiredPaths = requiredSourceSnippets
    .map((snippet, index) => ({ snippet, path: requiredPaths[index] }))
    .filter((entry) => !controllerText.includes(entry.snippet))
    .map((entry) => entry.path);
  const documentText = `${controllerText}\n${dtoText}`;
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
    'providerToken',
    'providerSecret',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'delivery_attempt',
    webhookDeliveryPaths: requiredPaths.filter(
      (pathName) => !missingRequiredPaths.includes(pathName)
    ),
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: controllerText.includes('@ApiBearerAuth()'),
    permissionGuardPresent:
      controllerText.includes("resource: 'integration.webhook', action: 'read'") &&
      controllerText.includes("resource: 'integration.webhook', action: 'write'"),
    idempotencyConflictStatusPresent:
      controllerText.includes('status: 409') && dtoText.includes('different operation'),
    dryRunReasonDtoPresent:
      dtoText.includes('class WebhookDeliveryOperationDto') &&
      dtoText.includes('reason!: string') &&
      dtoText.includes('dryRun') &&
      dtoText.includes('different operation'),
    noSwaggerEditorAuthority: !documentText.includes('swagger-editor'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      controllerText.includes('@ApiBearerAuth()') &&
      controllerText.includes("resource: 'integration.webhook', action: 'read'") &&
      controllerText.includes("resource: 'integration.webhook', action: 'write'") &&
      controllerText.includes('status: 409') &&
      dtoText.includes('different operation') &&
      dtoText.includes('class WebhookDeliveryOperationDto') &&
      !documentText.includes('swagger-editor'),
  };

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

function writeEventBackboneEvidence() {
  const out = readArg('--out', 'event-backbone-swagger-redaction.json');
  const controllerPath = path.join(
    productRoot,
    'apps/api/src/modules/event-backbone/event-backbone.controller.ts'
  );
  const dtoPath = path.join(
    productRoot,
    'apps/api/src/modules/event-backbone/dto/event-backbone.dto.ts'
  );
  const controllerText = readFileSync(controllerPath, 'utf8');
  const dtoText = readFileSync(dtoPath, 'utf8');
  const requiredPaths = [
    '/event-backbone/registry',
    '/event-backbone/subject-mapping',
    '/event-backbone/bullmq-classification',
    '/event-backbone/policy',
    '/event-backbone/summary',
    '/event-backbone/replay-preview',
  ];
  const requiredSourceSnippets = [
    "@Get('registry')",
    "@Get('subject-mapping')",
    "@Get('bullmq-classification')",
    "@Get('policy')",
    "@Get('summary')",
    "@Post('replay-preview')",
  ];
  const missingRequiredPaths = requiredSourceSnippets
    .map((snippet, index) => ({ snippet, path: requiredPaths[index] }))
    .filter((entry) => !controllerText.includes(entry.snippet))
    .map((entry) => entry.path);
  const documentText = `${controllerText}\n${dtoText}`;
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'providerToken',
    'providerSecret',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'event_backbone_adapter',
    eventBackbonePaths: requiredPaths.filter(
      (pathName) => !missingRequiredPaths.includes(pathName)
    ),
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: controllerText.includes('@ApiBearerAuth()'),
    acOnlyGuardPresent: controllerText.includes('AC operators only'),
    permissionResourcePresent: controllerText.includes("resource: 'platform.event_backbone'"),
    executePermissionForReplay: controllerText.includes("action: 'execute'"),
    replayReasonDtoPresent: dtoText.includes('reason!: string'),
    replayDryRunDtoPresent: dtoText.includes('dryRun'),
    noSwaggerEditorAuthority: !documentText.includes('swagger-editor'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      controllerText.includes('@ApiBearerAuth()') &&
      controllerText.includes('AC operators only') &&
      controllerText.includes("resource: 'platform.event_backbone'") &&
      controllerText.includes("action: 'execute'") &&
      dtoText.includes('reason!: string') &&
      dtoText.includes('dryRun') &&
      !documentText.includes('swagger-editor'),
  };

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

const filter = readArg('--filter', 'sso');

if (filter === 'platform-tools') {
  writePlatformToolEvidence();
} else if (filter === 'observability') {
  writeObservabilityEvidence();
} else if (filter === 'runtime-flags') {
  writeRuntimeFlagEvidence();
} else if (filter === 'webhook-delivery') {
  writeWebhookDeliveryEvidence();
} else if (filter === 'event-backbone') {
  writeEventBackboneEvidence();
} else {
  const scriptRelativePath = path.relative(path.join(productRoot, 'apps/api'), scriptPath);
  const result = spawnSync(
    'pnpm',
    ['--dir', 'apps/api', 'exec', 'ts-node', '-P', 'tsconfig.json', scriptRelativePath, ...args],
    {
      cwd: productRoot,
      stdio: 'inherit',
    }
  );

  process.exitCode = result.status ?? 1;
}
