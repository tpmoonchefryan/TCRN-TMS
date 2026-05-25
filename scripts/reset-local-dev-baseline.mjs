#!/usr/bin/env node

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env.local');
const DEFAULT_DATABASE_NAME = 'tcrn_tms';
const DEFAULT_SERVICES = ['postgres', 'redis', 'minio', 'nats'];
const DEFAULT_VOLUMES = [
  'tcrn-postgres-data',
  'tcrn-redis-data',
  'tcrn-minio-data',
  'tcrn-nats-data',
];
const OBSERVABILITY_SERVICES = ['loki', 'tempo'];
const OBSERVABILITY_VOLUMES = ['tcrn-loki-data', 'tcrn-tempo-data'];
const CADDY_VOLUMES = ['tcrn-caddy-data', 'tcrn-caddy-config', 'tcrn-caddy-logs'];
const REFUSED_SHORTCUTS = [
  'pnpm db:reset',
  'pnpm --filter @tcrn/database db:reset',
  'prisma migrate reset --force',
  'packages/database/scripts/reset-clean-db.sh --force',
];

function redactUrl(url) {
  const auth = url.username || url.password ? '<redacted>:<redacted>@' : '';
  return `${url.protocol}//${auth}${url.host}${url.pathname}`;
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '');
}

export function isLocalDatabaseHost(hostname) {
  const host = normalizeHostname(hostname);
  return (
    host === 'localhost' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host === 'postgres' ||
    host === 'tcrn-postgres' ||
    host === 'host.docker.internal' ||
    /^127\./.test(host)
  );
}

export function isLocalServerAddress(address) {
  if (!address) {
    return true;
  }
  const host = normalizeHostname(String(address));
  return (
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^192\.168\./.test(host)
  );
}

export function isAllowedDockerEndpoint(endpoint) {
  if (!endpoint) {
    return false;
  }
  if (/^ssh:\/\//i.test(endpoint) || /^tcp:\/\//i.test(endpoint)) {
    return false;
  }
  return /^unix:\/\//i.test(endpoint) || /^npipe:\/\//i.test(endpoint) || endpoint === 'desktop-linux';
}

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    confirmLocalReset: false,
    includeUat: false,
    includeObservability: false,
    authorizeObservabilityReset: false,
    includeCaddy: false,
    authorizeCaddyReset: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--confirm-local-reset') {
      options.confirmLocalReset = true;
    } else if (arg === '--include-uat') {
      options.includeUat = true;
    } else if (arg === '--include-observability') {
      options.includeObservability = true;
    } else if (arg === '--authorize-observability-reset') {
      options.authorizeObservabilityReset = true;
    } else if (arg === '--include-caddy') {
      options.includeCaddy = true;
    } else if (arg === '--authorize-caddy-reset') {
      options.authorizeCaddyReset = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.confirmLocalReset) {
    options.dryRun = true;
  }

  return options;
}

export function buildResetPlan(options, env = process.env) {
  if (options.includeObservability && !options.authorizeObservabilityReset) {
    throw new Error('Observability volume reset requires explicit authorization.');
  }
  if (options.includeCaddy && !options.authorizeCaddyReset) {
    throw new Error('Caddy volume reset requires explicit authorization.');
  }

  const services = [...DEFAULT_SERVICES];
  const volumes = [...DEFAULT_VOLUMES];

  if (options.includeObservability) {
    services.push(...OBSERVABILITY_SERVICES);
    volumes.push(...OBSERVABILITY_VOLUMES);
  }
  if (options.includeCaddy) {
    volumes.push(...CADDY_VOLUMES);
  }

  const destructive = options.confirmLocalReset && !options.dryRun;
  const commands = [
    'docker compose --env-file .env.local down --remove-orphans',
    `docker volume rm ${volumes.join(' ')}`,
    'pnpm infra:up',
    'pnpm --filter @tcrn/database db:apply-migrations',
    'pnpm --filter @tcrn/database db:sync-schemas',
    'pnpm --filter @tcrn/database db:seed',
  ];

  if (options.includeUat) {
    commands.push('pnpm --filter @tcrn/database db:seed:uat');
  }

  commands.push('pnpm --filter @tcrn/database db:refresh-snapshots');

  return {
    dryRun: !destructive,
    destructive,
    confirmation: options.confirmLocalReset ? 'present' : 'missing',
    refusalStatus: options.confirmLocalReset ? 'not_refused' : 'refused_destructive_execution_without_confirm',
    includeUat: options.includeUat,
    seedPlan: {
      baseSeed: 'run',
      uatSeed: options.includeUat ? 'run' : 'skip_missing_include_uat',
    },
    expectedDatabaseName: env.POSTGRES_DB || DEFAULT_DATABASE_NAME,
    services,
    volumes,
    commands,
    refusedShortcuts: REFUSED_SHORTCUTS.map((command) => ({
      command,
      status: 'refused_use_guarded_wrapper',
    })),
  };
}

export function validatePlanCommands(plan) {
  const forbidden = /\bdocker\s+compose\b[^\n]*\bdown\b[^\n]*(?:\s-v\b|\s--volumes\b)/;
  const hit = plan.commands.find((command) => forbidden.test(command));
  if (hit) {
    throw new Error(`Forbidden destructive compose command in plan: ${hit}`);
  }
}

function loadLocalEnv() {
  if (!existsSync(ENV_FILE)) {
    throw new Error('.env.local is required for guarded local reset.');
  }
  process.loadEnvFile(ENV_FILE);
  return { loaded: ['.env.local'] };
}

function parseDatabaseTarget(env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const url = new URL(env.DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const expectedDatabaseName = env.POSTGRES_DB || DEFAULT_DATABASE_NAME;

  if (!isLocalDatabaseHost(url.hostname)) {
    throw new Error(`DATABASE_URL host is not local: ${url.hostname}`);
  }
  if (databaseName !== expectedDatabaseName) {
    throw new Error('DATABASE_URL database name does not match the expected local database name.');
  }

  return {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port || '5432',
    databaseName,
    expectedDatabaseName,
    databaseNameMatches: true,
    redactedUrl: redactUrl(url),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(message || `${command} ${args.join(' ')} failed`);
  }

  return String(result.stdout || '').trim();
}

function readDockerContextProof() {
  const context = run('docker', ['context', 'show']);
  const inspect = run('docker', [
    'context',
    'inspect',
    '--format',
    '{{.Name}} {{.Endpoints.docker.Host}}',
  ]);
  const [name, endpoint] = inspect.split(/\s+/, 2);

  if (name !== context) {
    throw new Error('Docker context proof mismatch.');
  }
  if (!['default', 'desktop-linux'].includes(name)) {
    throw new Error(`Docker context is not allowlisted: ${name}`);
  }
  if (!isAllowedDockerEndpoint(endpoint)) {
    throw new Error(`Docker endpoint is not local: ${endpoint}`);
  }

  return { name, endpoint };
}

function readComposeProof() {
  const services = run('docker', ['compose', '--env-file', '.env.local', 'config', '--services'])
    .split(/\r?\n/)
    .filter(Boolean);
  const volumes = run('docker', ['compose', '--env-file', '.env.local', 'config', '--volumes'])
    .split(/\r?\n/)
    .filter(Boolean);
  let project = path.basename(REPO_ROOT);

  try {
    const configJson = run('docker', ['compose', '--env-file', '.env.local', 'config', '--format', 'json']);
    const parsed = JSON.parse(configJson);
    if (typeof parsed.name === 'string' && parsed.name.length > 0) {
      project = parsed.name;
    }
  } catch {
    project = path.basename(REPO_ROOT);
  }

  return { project, services, volumes };
}

async function readDatabaseIdentity(databaseUrl, expectedDatabaseName) {
  const requireFromDatabase = createRequire(path.join(REPO_ROOT, 'packages/database/package.json'));
  const { Client } = requireFromDatabase('pg');
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    const result = await client.query(
      'SELECT current_database() AS database_name, inet_server_addr()::text AS server_addr, inet_server_port() AS server_port',
    );
    const row = result.rows[0] ?? {};
    if (row.database_name !== expectedDatabaseName) {
      throw new Error('Live database identity does not match the expected local database name.');
    }
    if (!isLocalServerAddress(row.server_addr)) {
      throw new Error(`Live database server address is not local: ${row.server_addr}`);
    }
    return {
      databaseName: row.database_name,
      databaseNameMatches: true,
      serverAddress: row.server_addr || '<local-socket>',
      serverPort: Number(row.server_port),
      localServer: true,
    };
  } finally {
    await client.end();
  }
}

function printProof(proof) {
  console.log(JSON.stringify(proof, null, 2));
}

function printHelp() {
  console.log(`Usage:
  pnpm local:reset:dry-run
  pnpm local:reset -- --confirm-local-reset --include-uat

Options:
  --dry-run
  --confirm-local-reset
  --include-uat
  --include-observability --authorize-observability-reset
  --include-caddy --authorize-caddy-reset`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const envProof = loadLocalEnv();
  const databaseTarget = parseDatabaseTarget(process.env);
  const dockerContext = readDockerContextProof();
  const compose = readComposeProof();
  const plan = buildResetPlan(options, process.env);
  validatePlanCommands(plan);
  const databaseIdentity = await readDatabaseIdentity(process.env.DATABASE_URL, plan.expectedDatabaseName);

  const proof = {
    status: plan.dryRun ? 'dry_run' : 'ready_to_execute',
    env: envProof,
    databaseTarget,
    databaseIdentity,
    dockerContext,
    composeProject: compose.project,
    composeServicesAvailable: compose.services,
    composeVolumesAvailable: compose.volumes,
    resetPlan: plan,
  };

  printProof(proof);

  if (plan.dryRun) {
    return;
  }

  run('docker', ['compose', '--env-file', '.env.local', 'down', '--remove-orphans'], { stdio: 'inherit' });
  run('docker', ['volume', 'rm', ...plan.volumes], { stdio: 'inherit' });
  run('pnpm', ['infra:up'], { stdio: 'inherit' });
  run('pnpm', ['--filter', '@tcrn/database', 'db:apply-migrations'], { stdio: 'inherit' });
  run('pnpm', ['--filter', '@tcrn/database', 'db:sync-schemas'], { stdio: 'inherit' });
  run('pnpm', ['--filter', '@tcrn/database', 'db:seed'], { stdio: 'inherit' });
  if (plan.includeUat) {
    run('pnpm', ['--filter', '@tcrn/database', 'db:seed:uat'], { stdio: 'inherit' });
  }
  run('pnpm', ['--filter', '@tcrn/database', 'db:refresh-snapshots'], { stdio: 'inherit' });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
