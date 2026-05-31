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
    'api_key',
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
    'api_key',
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
    'api_key',
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

const filter = readArg('--filter', 'sso');

if (filter === 'platform-tools') {
  writePlatformToolEvidence();
} else if (filter === 'observability') {
  writeObservabilityEvidence();
} else if (filter === 'runtime-flags') {
  writeRuntimeFlagEvidence();
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
