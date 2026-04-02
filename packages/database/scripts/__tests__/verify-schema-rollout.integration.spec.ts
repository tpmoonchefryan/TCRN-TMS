// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// sort-imports-ignore
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { createTenantSchema, prisma } from '../../src/client';
import {
  type CliOptions,
  resolveVerificationTargets,
  verifySchemaRollout,
} from '../verify-schema-rollout';

describe('verify-schema-rollout integration', () => {
  it('proves destructive final-state rollout on a real tenant schema', async (t) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      t.skip('Database not available');
      return;
    }

    const schemaName = await createTenantSchema(randomUUID());

    t.after(async () => {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    });

    const options: CliOptions = {
      migrations: ['20260121154543_fix_homepage_schema_v2'],
      schemas: [schemaName],
      requiredTables: [],
      requiredColumns: [],
      requiredIndexes: [],
      requiredAbsentTables: [],
      requiredAbsentColumns: [],
      requiredAbsentIndexes: [],
      inferArtifactsFromMigrations: true,
      json: false,
    };

    const { resolvedOptions, inferredArtifacts } = resolveVerificationTargets(options);
    const summary = await verifySchemaRollout(prisma, resolvedOptions, inferredArtifacts);
    const indexRows = await prisma.$queryRawUnsafe<Array<{ tablename: string; indexname: string }>>(
      `
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = $1
          AND tablename IN (
            'adapter_config',
            'config_override',
            'integration_adapter',
            'marshmallow_reaction',
            'talent_homepage',
            'webhook'
          )
        ORDER BY tablename, indexname
      `,
      schemaName
    );

    assert.equal(
      summary.passed,
      true,
      JSON.stringify({ failures: summary.failures, indexRows }, null, 2)
    );
    assert.deepEqual(summary.failures, []);
    assert.ok(summary.inferredArtifacts);
    assert.ok(summary.inferredArtifacts.requiredColumns.includes('talent_homepage.theme'));
    assert.ok(!summary.inferredArtifacts.requiredAbsentColumns.includes('talent_homepage.theme'));
    assert.ok(summary.inferredArtifacts.requiredAbsentTables.includes('homepage_component'));
    assert.ok(summary.inferredArtifacts.requiredAbsentIndexes.includes('idx_change_log_entity'));
  });
});
