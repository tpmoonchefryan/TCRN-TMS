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
    secretReferenceInputOnly: documentText.includes('secretRef') && !documentText.includes('secretValue'),
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
    observabilityPaths: requiredPaths.filter((pathName) => !missingRequiredPaths.includes(pathName)),
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

const filter = readArg('--filter', 'sso');

if (filter === 'platform-tools') {
  writePlatformToolEvidence();
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
