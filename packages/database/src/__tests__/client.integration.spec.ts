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

async function getColumnMaxLength(
  schemaName: string,
  tableName: string,
  columnName: string,
): Promise<number | null> {
  const result = await prisma.$queryRawUnsafe<Array<{ length: number | null }>>(
    `
      SELECT character_maximum_length AS length
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
        AND column_name = $3
    `,
    schemaName,
    tableName,
    columnName,
  );

  return result[0]?.length ?? null;
}

async function getColumnDataType(
  schemaName: string,
  tableName: string,
  columnName: string,
): Promise<string | null> {
  const result = await prisma.$queryRawUnsafe<Array<{ dataType: string | null }>>(
    `
      SELECT data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
        AND column_name = $3
    `,
    schemaName,
    tableName,
    columnName,
  );

  return result[0]?.dataType ?? null;
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

  it('keeps preferred_language wide enough for expanded locale codes in template and cloned tenants', async (t) => {
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

    const [templateLength, schemaLength] = await Promise.all([
      getColumnMaxLength('tenant_template', 'system_user', 'preferred_language'),
      getColumnMaxLength(schemaName, 'system_user', 'preferred_language'),
    ]);

    assert.equal(templateLength, 16);
    assert.equal(schemaLength, 16);
  });

  it('keeps organization, config, integration, and profile-store extra_data JSONB columns in template and cloned tenants', async (t) => {
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

    const configTables = [
      'subsidiary',
      'talent',
      'channel_category',
      'business_segment',
      'communication_type',
      'address_type',
      'customer_status',
      'reason_category',
      'inactivation_reason',
      'membership_class',
      'consent',
      'consumer',
      'integration_adapter',
      'profile_store',
      'webhook',
    ] as const;

    for (const tableName of configTables) {
      const [templateType, schemaType] = await Promise.all([
        getColumnDataType('tenant_template', tableName, 'extra_data'),
        getColumnDataType(schemaName, tableName, 'extra_data'),
      ]);

      assert.equal(templateType, 'jsonb', `${tableName} template extra_data should be jsonb`);
      assert.equal(schemaType, 'jsonb', `${tableName} cloned tenant extra_data should be jsonb`);
    }
  });

  it('keeps email_template extra_data JSONB column in public schema', async (t) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      t.skip('Database not available');
      return;
    }

    const columnType = await getColumnDataType('public', 'email_template', 'extra_data');
    assert.equal(columnType, 'jsonb');
  });
});
