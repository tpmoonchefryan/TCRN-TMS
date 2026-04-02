// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { createTenantSchema, prisma } from '../client';

async function getTableCount(schemaName: string, tableName: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM "${schemaName}"."${tableName}"`
  );

  return Number(result[0]?.count ?? 0n);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSchemaDefinition(definition: string, schemaName: string): string {
  return definition
    .replace(new RegExp(`"${escapeRegExp(schemaName)}"\\.`, 'g'), '"<SCHEMA>".')
    .replace(new RegExp(`\\b${escapeRegExp(schemaName)}\\.`, 'g'), '<SCHEMA>.');
}

async function getIndexNames(
  schemaName: string,
  tableNames: readonly string[]
): Promise<Array<{ tableName: string; indexName: string }>> {
  return prisma.$queryRawUnsafe<Array<{ tableName: string; indexName: string }>>(
    `
      SELECT
        tablename AS "tableName",
        indexname AS "indexName"
      FROM pg_indexes
      WHERE schemaname = $1
        AND tablename = ANY($2::text[])
      ORDER BY tablename, indexname
    `,
    schemaName,
    tableNames
  );
}

async function getForeignKeys(schemaName: string): Promise<
  Array<{ tableName: string; constraintName: string; definition: string }>
> {
  return prisma.$queryRawUnsafe<Array<{ tableName: string; constraintName: string; definition: string }>>(
    `
      SELECT
        rel.relname AS "tableName",
        con.conname AS "constraintName",
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = $1
        AND con.contype = 'f'
      ORDER BY rel.relname, con.conname
    `,
    schemaName
  );
}

describe('createTenantSchema integration', () => {
  it('copies tenant-local membership lookup data from tenant_template', async (t) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      t.skip('Database not available');
      return;
    }

    const tenantId = randomUUID();
    const schemaName = await createTenantSchema(tenantId);

    t.after(async () => {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    });

    const [
      templateSocialPlatforms,
      schemaSocialPlatforms,
      templateMembershipClasses,
      schemaMembershipClasses,
      templateMembershipTypes,
      schemaMembershipTypes,
      templateMembershipLevels,
      schemaMembershipLevels,
    ] = await Promise.all([
      getTableCount('tenant_template', 'social_platform'),
      getTableCount(schemaName, 'social_platform'),
      getTableCount('tenant_template', 'membership_class'),
      getTableCount(schemaName, 'membership_class'),
      getTableCount('tenant_template', 'membership_type'),
      getTableCount(schemaName, 'membership_type'),
      getTableCount('tenant_template', 'membership_level'),
      getTableCount(schemaName, 'membership_level'),
    ]);

    assert.equal(schemaSocialPlatforms, templateSocialPlatforms);
    assert.equal(schemaMembershipClasses, templateMembershipClasses);
    assert.equal(schemaMembershipTypes, templateMembershipTypes);
    assert.equal(schemaMembershipLevels, templateMembershipLevels);
  });

  it('aligns non-constraint index names with tenant_template', async (t) => {
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

    const tables = [
      'adapter_config',
      'config_override',
      'integration_adapter',
      'marshmallow_reaction',
      'talent_homepage',
      'webhook',
    ] as const;

    const [templateIndexes, schemaIndexes] = await Promise.all([
      getIndexNames('tenant_template', tables),
      getIndexNames(schemaName, tables),
    ]);

    assert.deepEqual(schemaIndexes, templateIndexes);
  });

  it('copies tenant foreign keys from tenant_template', async (t) => {
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

    const [templateForeignKeys, schemaForeignKeys] = await Promise.all([
      getForeignKeys('tenant_template'),
      getForeignKeys(schemaName),
    ]);

    assert.deepEqual(
      schemaForeignKeys.map((constraint) => ({
        ...constraint,
        definition: normalizeSchemaDefinition(constraint.definition, schemaName),
      })),
      templateForeignKeys.map((constraint) => ({
        ...constraint,
        definition: normalizeSchemaDefinition(constraint.definition, 'tenant_template'),
      }))
    );
  });
});
