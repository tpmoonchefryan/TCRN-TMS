// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it, vi } from 'vitest';

import { createTestTenantFixture, generateSchemaName } from './test-utils';

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
        'fixture',
      ),
    ).rejects.toThrow('copy failed');

    expect(create).toHaveBeenCalledTimes(1);
    const dropSchemaCall = execute.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.startsWith('DROP SCHEMA IF EXISTS "tenant_test_fixture') &&
        sql.endsWith('" CASCADE'),
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
      'fixture',
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
        sql.endsWith('" CASCADE'),
    );

    expect(dropSchemaCallIndex).toBeGreaterThanOrEqual(0);
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[dropSchemaCallIndex],
    );
    expect(deleteFn.mock.invocationCallOrder[0]).toBeGreaterThan(
      execute.mock.invocationCallOrder[dropSchemaCallIndex],
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
      'fixture',
    );

    expect(scanActiveTenantSchemas()).toEqual(['tenant_test_fixture']);

    await fixture.cleanup();

    expect(update).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledTimes(1);
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
