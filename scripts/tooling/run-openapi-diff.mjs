#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const productRoot = process.cwd();
const currentDir = path.join(productRoot, '.tmp/openapi-current');
const normalizedDir = path.join(productRoot, '.tmp/openapi-diff-normalized');
const baselineDir = path.join(productRoot, 'apps/api/openapi-baseline');
const documents = ['openapi-operations.json', 'openapi-config.json', 'openapi-public.json'];
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepCurrent = process.env.TCRN_KEEP_OPENAPI_CURRENT === '1';

function run(command, args) {
  return spawnSync(command, args, {
    cwd: productRoot,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });
}

function sortedObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortedObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedObject(value[key])])
  );
}

function normalizeParameters(parameters) {
  if (!Array.isArray(parameters)) {
    return parameters;
  }

  const byKey = new Map();
  const ordered = [];

  for (const parameter of parameters) {
    if (!parameter || typeof parameter !== 'object') {
      ordered.push(parameter);
      continue;
    }

    const location = parameter.in;
    const originalName = parameter.name;
    const name =
      location === 'header' && typeof originalName === 'string'
        ? originalName.toLowerCase()
        : originalName;
    const key = `${location ?? ''}:${name ?? ''}`;
    const normalizedParameter = sortedObject({
      ...parameter,
      name,
      required: Boolean(parameter.required),
    });

    if (!byKey.has(key)) {
      byKey.set(key, normalizedParameter);
      ordered.push(normalizedParameter);
      continue;
    }

    const previous = byKey.get(key);
    const merged = sortedObject({
      ...previous,
      ...normalizedParameter,
      description: previous.description ?? normalizedParameter.description,
      required: Boolean(previous.required || normalizedParameter.required),
    });
    byKey.set(key, merged);
    const index = ordered.indexOf(previous);
    if (index >= 0) {
      ordered[index] = merged;
    }
  }

  return ordered.sort((left, right) => {
    const leftKey = `${left?.in ?? ''}:${left?.name ?? ''}`;
    const rightKey = `${right?.in ?? ''}:${right?.name ?? ''}`;
    return leftKey.localeCompare(rightKey);
  });
}

function normalizeOpenApiDocument(inputPath, outputPath) {
  const document = JSON.parse(readFileSync(inputPath, 'utf8'));
  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object') {
        continue;
      }
      operation.parameters = normalizeParameters(operation.parameters);
    }
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(sortedObject(document), null, 2)}\n`);
}

let worstStatus = 0;

try {
  const exportResult = run('pnpm', [
    '--dir',
    'apps/api',
    'exec',
    'ts-node',
    'scripts/api-registry-openapi-export.ts',
    '--out-dir',
    '../../.tmp/openapi-current',
  ]);

  if (exportResult.error) {
    throw exportResult.error;
  }
  if (exportResult.status !== 0) {
    worstStatus = exportResult.status ?? 1;
  }

  for (const documentName of documents) {
    const baseline = path.join(baselineDir, documentName);
    const current = path.join(currentDir, documentName);

    if (!existsSync(baseline) || !existsSync(current)) {
      console.warn(`[tooling:openapi] SKIP ${documentName}: baseline or current document is missing.`);
      worstStatus = worstStatus || 1;
      continue;
    }

    console.log(`[tooling:openapi] diff ${documentName}`);
    const normalizedBaseline = path.join(normalizedDir, 'baseline', documentName);
    const normalizedCurrent = path.join(normalizedDir, 'current', documentName);
    normalizeOpenApiDocument(baseline, normalizedBaseline);
    normalizeOpenApiDocument(current, normalizedCurrent);

    const diffResult = run('oasdiff', [
      'breaking',
      normalizedBaseline,
      normalizedCurrent,
      '--format',
      'text',
      '--fail-on',
      'ERR',
    ]);

    if (diffResult.error?.code === 'ENOENT') {
      console.warn('[tooling:openapi] SKIP: oasdiff is not installed on PATH.');
      worstStatus = worstStatus || 127;
      break;
    }
    if (diffResult.error) {
      throw diffResult.error;
    }
    if (diffResult.status !== 0) {
      worstStatus = worstStatus || diffResult.status || 1;
    }
  }
} finally {
  if (!keepCurrent) {
    rmSync(currentDir, { force: true, recursive: true });
  }
  rmSync(normalizedDir, { force: true, recursive: true });
}

if (worstStatus !== 0) {
  console.warn(
    `[tooling:openapi] ADVISORY_EXIT=${worstStatus}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? worstStatus : 0);
}

console.log('[tooling:openapi] OK');
