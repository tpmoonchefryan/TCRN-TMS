// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it, vi } from 'vitest';

import { createTestTenantFixture } from './test-utils';

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
    const query = vi.fn().mockResolvedValue([{ tablename: 'resource' }]);

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
    const query = vi.fn().mockResolvedValue([]);

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
});
