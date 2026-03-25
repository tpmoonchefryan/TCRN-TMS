// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Regression proof for repairing drifted RBAC rows in an existing tenant schema

import { PrismaClient } from '@tcrn/database';
import { createTestTenantFixture, type TenantFixture } from '@tcrn/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getSchemaCounts,
  syncRbacContractSchemas,
} from '../../../../packages/database/scripts/sync-rbac-contract';

describe('RBAC Contract Sync Integration', () => {
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;

  beforeAll(async () => {
    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'rbac_sync');
  });

  afterAll(async () => {
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('restores deleted policies, missing role mappings, and inactive canonical rows', async () => {
    const schemaName = tenantFixture.schemaName;
    const baselineCounts = await getSchemaCounts(prisma, schemaName);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schemaName}".role_policy rp
      USING "${schemaName}".policy p, "${schemaName}".resource r
      WHERE rp.policy_id = p.id
        AND p.resource_id = r.id
        AND r.code = 'customer.export'
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schemaName}".policy p
      USING "${schemaName}".resource r
      WHERE p.resource_id = r.id
        AND r.code = 'customer.export'
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schemaName}".resource
      WHERE code = 'customer.export'
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schemaName}".role_policy rp
      USING "${schemaName}".policy p, "${schemaName}".resource r
      WHERE rp.policy_id = p.id
        AND p.resource_id = r.id
        AND r.code = 'talent.marshmallow'
        AND p.action = 'execute'
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schemaName}".policy p
      USING "${schemaName}".resource r
      WHERE p.resource_id = r.id
        AND r.code = 'talent.marshmallow'
        AND p.action = 'execute'
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".resource
      SET module = 'customer',
          is_active = false,
          updated_at = now()
      WHERE code = 'talent.marshmallow'
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".role
      SET is_active = false,
          updated_at = now()
      WHERE code = 'TENANT_ADMIN'
    `);

    const driftedCounts = await getSchemaCounts(prisma, schemaName);

    expect(driftedCounts.resources).toBe(baselineCounts.resources - 1);
    expect(driftedCounts.policies).toBe(baselineCounts.policies - 5);
    expect(driftedCounts.roles).toBe(baselineCounts.roles);
    expect(driftedCounts.rolePolicies).toBeLessThan(baselineCounts.rolePolicies);

    const [customerExportBefore] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count
       FROM "${schemaName}".resource
       WHERE code = 'customer.export'`,
    );
    expect(Number(customerExportBefore?.count ?? 0)).toBe(0);

    const [marshmallowBefore] = await prisma.$queryRawUnsafe<
      Array<{ module: string; isActive: boolean }>
    >(
      `SELECT module, is_active AS "isActive"
       FROM "${schemaName}".resource
       WHERE code = 'talent.marshmallow'`,
    );
    expect(marshmallowBefore).toEqual({
      module: 'customer',
      isActive: false,
    });

    const [tenantAdminBefore] = await prisma.$queryRawUnsafe<Array<{ isActive: boolean }>>(
      `SELECT is_active AS "isActive"
       FROM "${schemaName}".role
       WHERE code = 'TENANT_ADMIN'`,
    );
    expect(tenantAdminBefore?.isActive).toBe(false);

    const [result] = await syncRbacContractSchemas(prisma, {
      schemas: [schemaName],
      skipTemplate: true,
    });

    expect(result.schemaName).toBe(schemaName);
    expect(result.before).toEqual(driftedCounts);
    expect(result.after).toEqual(baselineCounts);

    const [customerExportAfter] = await prisma.$queryRawUnsafe<
      Array<{ module: string; isActive: boolean }>
    >(
      `SELECT module, is_active AS "isActive"
       FROM "${schemaName}".resource
       WHERE code = 'customer.export'`,
    );
    expect(customerExportAfter).toEqual({
      module: 'customer',
      isActive: true,
    });

    const [marshmallowAfter] = await prisma.$queryRawUnsafe<
      Array<{ module: string; isActive: boolean }>
    >(
      `SELECT module, is_active AS "isActive"
       FROM "${schemaName}".resource
       WHERE code = 'talent.marshmallow'`,
    );
    expect(marshmallowAfter).toEqual({
      module: 'external',
      isActive: true,
    });

    const [marshmallowExecutePolicy] = await prisma.$queryRawUnsafe<Array<{ isActive: boolean }>>(
      `SELECT p.is_active AS "isActive"
       FROM "${schemaName}".policy p
       JOIN "${schemaName}".resource r ON r.id = p.resource_id
       WHERE r.code = 'talent.marshmallow'
         AND p.action = 'execute'`,
    );
    expect(marshmallowExecutePolicy?.isActive).toBe(true);

    const [customerManagerExportPolicy] = await prisma.$queryRawUnsafe<Array<{ effect: string }>>(
      `SELECT rp.effect
       FROM "${schemaName}".role_policy rp
       JOIN "${schemaName}".role rl ON rl.id = rp.role_id
       JOIN "${schemaName}".policy p ON p.id = rp.policy_id
       JOIN "${schemaName}".resource r ON r.id = p.resource_id
       WHERE rl.code = 'CUSTOMER_MANAGER'
         AND r.code = 'customer.export'
         AND p.action = 'write'`,
    );
    expect(customerManagerExportPolicy?.effect).toBe('grant');

    const [contentManagerMarshmallowPolicy] = await prisma.$queryRawUnsafe<Array<{ effect: string }>>(
      `SELECT rp.effect
       FROM "${schemaName}".role_policy rp
       JOIN "${schemaName}".role rl ON rl.id = rp.role_id
       JOIN "${schemaName}".policy p ON p.id = rp.policy_id
       JOIN "${schemaName}".resource r ON r.id = p.resource_id
       WHERE rl.code = 'CONTENT_MANAGER'
         AND r.code = 'talent.marshmallow'
         AND p.action = 'execute'`,
    );
    expect(contentManagerMarshmallowPolicy?.effect).toBe('grant');

    const [tenantAdminAfter] = await prisma.$queryRawUnsafe<Array<{ isActive: boolean }>>(
      `SELECT is_active AS "isActive"
       FROM "${schemaName}".role
       WHERE code = 'TENANT_ADMIN'`,
    );
    expect(tenantAdminAfter?.isActive).toBe(true);
  });
});
