// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

import { createTestTenantFixture, createTestUserInTenant, generateSchemaName } from './test-utils';

describe('createTestTenantFixture', () => {
  it('rolls back tenant metadata when fixture bootstrap fails after schema creation', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'tenant-123',
      code: 'TEST_FIXTURE',
      name: 'Test Fixture',
      schemaName: 'tenant_test_fixture',
      tier: 'standard',
      isActive: true,
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const execute = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('copy failed'))
      .mockResolvedValue(undefined);
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM pg_tables')) {
        return [{ tablename: 'resource' }];
      }

      return [];
    });

    await expect(
      createTestTenantFixture(
        {
          tenant: {
            create,
            update,
            delete: deleteFn,
          },
          $executeRawUnsafe: execute,
          $queryRawUnsafe: query,
        },
        'fixture'
      )
    ).rejects.toThrow('copy failed');

    expect(create).toHaveBeenCalledTimes(1);
    const dropSchemaCall = execute.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.startsWith('DROP SCHEMA IF EXISTS "tenant_test_fixture') &&
        sql.endsWith('" CASCADE')
    );
    expect(dropSchemaCall).toBeDefined();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
      data: { isActive: false },
    });
    expect(deleteFn).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
    });
  });

  it('marks the tenant inactive before dropping the schema during cleanup', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'tenant-123',
      code: 'TEST_FIXTURE',
      name: 'Test Fixture',
      schemaName: 'tenant_test_fixture',
      tier: 'standard',
      isActive: true,
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM pg_tables')) {
        return [];
      }

      return [];
    });

    const fixture = await createTestTenantFixture(
      {
        tenant: {
          create,
          update,
          delete: deleteFn,
        },
        $executeRawUnsafe: execute,
        $queryRawUnsafe: query,
      },
      'fixture'
    );

    await fixture.cleanup();

    expect(update).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
      data: { isActive: false },
    });

    const dropSchemaCallIndex = execute.mock.calls.findIndex(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.startsWith('DROP SCHEMA IF EXISTS "tenant_test_fixture') &&
        sql.endsWith('" CASCADE')
    );

    expect(dropSchemaCallIndex).toBeGreaterThanOrEqual(0);
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[dropSchemaCallIndex]
    );
    expect(deleteFn.mock.invocationCallOrder[0]).toBeGreaterThan(
      execute.mock.invocationCallOrder[dropSchemaCallIndex]
    );
  });

  it('removes the tenant from active-schema scans before the schema is dropped', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'tenant-123',
      code: 'TEST_FIXTURE',
      name: 'Test Fixture',
      schemaName: 'tenant_test_fixture',
      tier: 'standard',
      isActive: true,
    });

    let isActive = true;
    let schemaExists = true;

    const scanActiveTenantSchemas = () => {
      if (!isActive) {
        return [];
      }

      if (!schemaExists) {
        throw new Error('42P01: relation does not exist');
      }

      return ['tenant_test_fixture'];
    };

    const update = vi.fn().mockImplementation(async () => {
      isActive = false;
      return undefined;
    });
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockImplementation(async (sql: string) => {
      if (
        sql.startsWith('DROP SCHEMA IF EXISTS "tenant_test_fixture') &&
        sql.endsWith('" CASCADE')
      ) {
        schemaExists = false;
        expect(scanActiveTenantSchemas()).toEqual([]);
      }

      return undefined;
    });
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM pg_tables')) {
        return [];
      }

      return [];
    });

    const fixture = await createTestTenantFixture(
      {
        tenant: {
          create,
          update,
          delete: deleteFn,
        },
        $executeRawUnsafe: execute,
        $queryRawUnsafe: query,
      },
      'fixture'
    );

    expect(scanActiveTenantSchemas()).toEqual(['tenant_test_fixture']);

    await fixture.cleanup();

    expect(update).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledTimes(1);
  });

  it('seeds a default active profile store when tenant_template has none', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'tenant-123',
      code: 'TEST_FIXTURE',
      name: 'Test Fixture',
      schemaName: 'tenant_test_fixture',
      tier: 'standard',
      isActive: true,
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM pg_tables')) {
        return [{ tablename: 'profile_store' }];
      }

      return [];
    });

    await createTestTenantFixture(
      {
        tenant: {
          create,
          update,
          delete: deleteFn,
        },
        $executeRawUnsafe: execute,
        $queryRawUnsafe: query,
      },
      'fixture'
    );

    const profileStoreSeedCall = execute.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('.profile_store') &&
        sql.includes("'DEFAULT_STORE'") &&
        sql.includes('is_default = true') &&
        sql.includes('is_active = true')
    );

    expect(profileStoreSeedCall).toBeDefined();
  });
});

describe('generateSchemaName', () => {
  it('preserves entropy beyond the first 20 characters to avoid repeated schema collisions', () => {
    const first = generateSchemaName('TEST_DOMAINLOOKUP_MNVKFR_A1B2');
    const second = generateSchemaName('TEST_DOMAINLOOKUP_MNVKFR_Z9Y8');

    expect(first).toBe('tenant_test_domainlookup_mnvkfr_a1b2');
    expect(second).toBe('tenant_test_domainlookup_mnvkfr_z9y8');
    expect(first).not.toBe(second);
  });

  it('stays within postgres identifier limits', () => {
    const schemaName = generateSchemaName(`TEST_${'X'.repeat(100)}`);

    expect(schemaName.length).toBeLessThanOrEqual(63);
  });
});

describe('createTestUserInTenant', () => {
  it('maps legacy admin compatibility roles to the canonical initial admin role', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockResolvedValue([{ id: 'role-initial-admin' }]);

    const user = await createTestUserInTenant(
      {
        $executeRawUnsafe: execute,
        $queryRawUnsafe: query,
      },
      {
        tenant: {
          id: 'tenant-123',
          code: 'TEST_FIXTURE',
          name: 'Test Fixture',
          schemaName: 'tenant_test_fixture',
          tier: 'standard',
          isActive: true,
        },
        schemaName: 'tenant_test_fixture',
        cleanup: async () => undefined,
      },
      'legacy_admin_user',
      ['ADMIN']
    );

    expect(query).toHaveBeenCalledWith(expect.any(String), 'INITIAL_ADMIN');
    expect(user.roles).toEqual(['ADMIN']);
  });
});
