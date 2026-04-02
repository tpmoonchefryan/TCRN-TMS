// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTestTenantFixture } from '@tcrn/shared';

import { prisma } from '../client';

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

describe('createTestTenantFixture integration', () => {
  it('copies membership lookups and tenant foreign keys from tenant_template', async (t) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      t.skip('Database not available');
      return;
    }

    const fixture = await createTestTenantFixture(
      prisma as unknown as Parameters<typeof createTestTenantFixture>[0],
      'shared_bootstrap'
    );

    t.after(async () => {
      await fixture.cleanup();
    });

    const [
      templateSocialPlatforms,
      fixtureSocialPlatforms,
      templateMembershipClasses,
      fixtureMembershipClasses,
      templateMembershipTypes,
      fixtureMembershipTypes,
      templateMembershipLevels,
      fixtureMembershipLevels,
      templateForeignKeys,
      fixtureForeignKeys,
    ] = await Promise.all([
      getTableCount('tenant_template', 'social_platform'),
      getTableCount(fixture.schemaName, 'social_platform'),
      getTableCount('tenant_template', 'membership_class'),
      getTableCount(fixture.schemaName, 'membership_class'),
      getTableCount('tenant_template', 'membership_type'),
      getTableCount(fixture.schemaName, 'membership_type'),
      getTableCount('tenant_template', 'membership_level'),
      getTableCount(fixture.schemaName, 'membership_level'),
      getForeignKeys('tenant_template'),
      getForeignKeys(fixture.schemaName),
    ]);

    assert.equal(fixtureSocialPlatforms, templateSocialPlatforms);
    assert.equal(fixtureMembershipClasses, templateMembershipClasses);
    assert.equal(fixtureMembershipTypes, templateMembershipTypes);
    assert.equal(fixtureMembershipLevels, templateMembershipLevels);
    assert.deepEqual(
      fixtureForeignKeys.map((constraint) => ({
        ...constraint,
        definition: normalizeSchemaDefinition(constraint.definition, fixture.schemaName),
      })),
      templateForeignKeys.map((constraint) => ({
        ...constraint,
        definition: normalizeSchemaDefinition(constraint.definition, 'tenant_template'),
      }))
    );
  });
});
