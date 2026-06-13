// SPDX-License-Identifier: Apache-2.0
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

describe('verify-schema-rollout marshmallow path contract', () => {
  it('proves fresh tenant schemas keep talent.marshmallow_path and do not require marshmallow_config.path', async (t) => {
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
      migrations: [],
      schemas: [schemaName],
      requiredTables: [],
      requiredColumns: [{ tableName: 'talent', columnName: 'marshmallow_path' }],
      requiredIndexes: [],
      requiredAbsentTables: [],
      requiredAbsentColumns: [{ tableName: 'marshmallow_config', columnName: 'path' }],
      requiredAbsentIndexes: [],
      inferArtifactsFromMigrations: false,
      json: false,
    };

    const { resolvedOptions, inferredArtifacts } = resolveVerificationTargets(options);
    const summary = await verifySchemaRollout(prisma, resolvedOptions, inferredArtifacts);

    assert.equal(summary.passed, true, JSON.stringify(summary, null, 2));
    assert.deepEqual(summary.failures, []);
    assert.deepEqual(summary.checkedSchemas, [schemaName]);

    const schemaArtifacts = summary.schemaArtifacts[0];
    assert.ok(schemaArtifacts);
    assert.equal(schemaArtifacts.passed, true);
    assert.equal(schemaArtifacts.columns[0]?.tableName, 'talent');
    assert.equal(schemaArtifacts.columns[0]?.columnName, 'marshmallow_path');
    assert.equal(schemaArtifacts.columns[0]?.present, true);
    assert.equal(
      schemaArtifacts.absentColumns[0]?.tableName,
      'marshmallow_config',
    );
    assert.equal(schemaArtifacts.absentColumns[0]?.columnName, 'path');
    assert.equal(schemaArtifacts.absentColumns[0]?.present, false);
  });
});
