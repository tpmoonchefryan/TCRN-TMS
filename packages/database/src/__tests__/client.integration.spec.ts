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
});
