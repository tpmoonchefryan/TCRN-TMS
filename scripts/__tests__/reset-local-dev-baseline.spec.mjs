import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildResetPlan,
  isAllowedDockerEndpoint,
  isLocalDatabaseHost,
  isLocalServerAddress,
  parseArgs,
  validatePlanCommands,
} from '../reset-local-dev-baseline.mjs';

describe('reset-local-dev-baseline guard contract', () => {
  it('defaults to dry-run and refuses destructive execution without confirmation', () => {
    const options = parseArgs([]);
    const plan = buildResetPlan(options, { POSTGRES_DB: 'tcrn_tms' });

    assert.equal(plan.dryRun, true);
    assert.equal(plan.destructive, false);
    assert.equal(plan.confirmation, 'missing');
    assert.equal(plan.refusalStatus, 'refused_destructive_execution_without_confirm');
    assert.deepEqual(plan.seedPlan, {
      baseSeed: 'run',
      uatSeed: 'skip_missing_include_uat',
    });
    assert.deepEqual(plan.volumes, [
      'tcrn-postgres-data',
      'tcrn-redis-data',
      'tcrn-minio-data',
      'tcrn-nats-data',
    ]);
    assert.equal(plan.commands.some((command) => command.includes('down -v')), false);
    assert.ok(plan.refusedShortcuts.some((entry) => entry.command === 'pnpm db:reset'));
    validatePlanCommands(plan);
  });

  it('requires explicit UAT opt-in before planning the UAT seed command', () => {
    const withoutUat = buildResetPlan(parseArgs(['--confirm-local-reset']), {});
    const withUat = buildResetPlan(parseArgs(['--', '--confirm-local-reset', '--include-uat']), {});

    assert.equal(withoutUat.commands.some((command) => command.includes('db:seed:uat')), false);
    assert.equal(withUat.destructive, true);
    assert.equal(withUat.seedPlan.uatSeed, 'run');
    assert.ok(withUat.commands.some((command) => command.includes('db:seed:uat')));
  });

  it('rejects optional observability and Caddy scopes without explicit authorization flags', () => {
    assert.throws(
      () => buildResetPlan(parseArgs(['--include-observability']), {}),
      /Observability volume reset requires explicit authorization/,
    );
    assert.throws(
      () => buildResetPlan(parseArgs(['--include-caddy']), {}),
      /Caddy volume reset requires explicit authorization/,
    );
  });

  it('accepts only local database hosts and local Docker endpoints', () => {
    assert.equal(isLocalDatabaseHost('localhost'), true);
    assert.equal(isLocalDatabaseHost('127.0.0.1'), true);
    assert.equal(isLocalDatabaseHost('postgres'), true);
    assert.equal(isLocalDatabaseHost('db.prod.example.com'), false);
    assert.equal(isLocalServerAddress('127.0.0.1'), true);
    assert.equal(isLocalServerAddress('172.18.0.5/32'), true);
    assert.equal(isLocalServerAddress('203.0.113.10'), false);

    assert.equal(isAllowedDockerEndpoint('unix:///Users/example/.docker/run/docker.sock'), true);
    assert.equal(isAllowedDockerEndpoint('ssh://prod-host'), false);
    assert.equal(isAllowedDockerEndpoint('tcp://10.0.0.2:2375'), false);
  });

  it('fails if any plan contains docker compose down -v', () => {
    assert.throws(
      () =>
        validatePlanCommands({
          commands: ['docker compose --env-file .env.local down -v'],
        }),
      /Forbidden destructive compose command/,
    );
  });
});
