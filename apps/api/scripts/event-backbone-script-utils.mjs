// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const productRoot = path.resolve(scriptDir, '../../..');
export const eventBackboneFixturePath = path.join(
  productRoot,
  'tmp/p8-event-backbone/fixtures.json'
);

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
    } else if (!options._) {
      options._ = [arg];
    } else {
      options._.push(arg);
    }
  }

  return options;
}

export function resolveProductPath(...segments) {
  return path.join(productRoot, ...segments);
}

export function readProductText(...segments) {
  return readFileSync(resolveProductPath(...segments), 'utf8');
}

export function readJson(...segments) {
  return JSON.parse(readProductText(...segments));
}

export function writeJson(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function runRg(args) {
  try {
    return execFileSync('rg', args, {
      cwd: productRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function writeFixture(payload) {
  mkdirSync(path.dirname(eventBackboneFixturePath), { recursive: true });
  writeFileSync(eventBackboneFixturePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function readFixture() {
  try {
    return JSON.parse(readFileSync(eventBackboneFixturePath, 'utf8'));
  } catch {
    return null;
  }
}

export function removeFixture() {
  rmSync(eventBackboneFixturePath, { force: true });
}

export function sourceSignals() {
  return {
    sharedRegistry: readProductText('packages/shared/src/event-backbone/index.ts'),
    sharedRbac: readProductText('packages/shared/src/rbac/catalog.ts'),
    controller: readProductText(
      'apps/api/src/modules/event-backbone/event-backbone.controller.ts'
    ),
    service: readProductText('apps/api/src/modules/event-backbone/event-backbone.service.ts'),
    repository: readProductText(
      'apps/api/src/modules/event-backbone/event-backbone.repository.ts'
    ),
    configSchema: readProductText('apps/api/src/config/config.schema.ts'),
    prismaSchema: readProductText('packages/database/prisma/schema.prisma'),
    migration: readProductText(
      'packages/database/prisma/migrations/20260531091000_add_event_backbone_outbox/migration.sql'
    ),
    platformToolsScreen: readProductText(
      'apps/web/src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
    ),
    platformToolsCopy: readProductText(
      'apps/web/src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
  };
}
