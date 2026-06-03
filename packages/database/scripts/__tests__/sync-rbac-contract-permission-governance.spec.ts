import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertInitialAdminCompatibilityReadback,
  readInitialAdminCompatibilityReadback,
} from '../sync-rbac-contract';

type QueryResult = Array<Record<string, unknown>>;

function createQueryRunner(results: QueryResult[]) {
  return {
    calls: [] as string[],
    async $queryRawUnsafe<T = unknown>(query: string, ..._values: unknown[]): Promise<T> {
      this.calls.push(query);
      const result = results.shift();

      if (!result) {
        throw new Error(`Unexpected query: ${query}`);
      }

      return result as T;
    },
  };
}

describe('permission governance RBAC sync contract', () => {
  it('blocks legacy built-in role relabeling without active tenant-scope Initial Admin coverage', async () => {
    const runner = createQueryRunner([
      [{ count: 4n }],
      [{ count: 1n }],
      [{ count: 0n }],
      [{ exists: true }],
      [{ count: 0n }],
      [{ count: 2n }],
      [],
    ]);

    await assert.rejects(
      assertInitialAdminCompatibilityReadback(runner, 'tenant_acme'),
      /active tenant-scope Initial Admin assignment/,
    );
  });

  it('reports Initial Admin, legacy compatibility, no-delete, and role definition readback data', async () => {
    const runner = createQueryRunner([
      [{ count: 1n }],
      [{ count: 1n }],
      [{ count: 3n }],
      [{ exists: true }],
      [{ count: 1n }],
      [{ count: 2n }],
      [
        {
          roleCode: 'INITIAL_ADMIN',
          createdAt: new Date('2026-06-04T00:00:00.000Z'),
          updatedAt: new Date('2026-06-04T00:00:00.000Z'),
          roleDefinitionRecord: { lastPermissionVersion: 3 },
        },
      ],
    ]);

    const readback = await readInitialAdminCompatibilityReadback(runner, 'tenant_acme');

    assert.equal(readback.systemRoleCount, 1);
    assert.equal(readback.legacyBuiltInSystemRoleCount, 1);
    assert.equal(readback.initialAdminAssignmentCount, 1);
    assert.equal(readback.assignedLegacyRoleCount, 2);
    assert.equal(readback.legacyCompatibilityRoleCount, 3);
    assert.equal(readback.zeroDeletedRoleRows, true);
    assert.equal(readback.noLastAdminInvariant.status, 'passed');
    assert.deepEqual(readback.roleDefinitionRecords, [
      {
        roleCode: 'INITIAL_ADMIN',
        createdAt: new Date('2026-06-04T00:00:00.000Z'),
        updatedAt: new Date('2026-06-04T00:00:00.000Z'),
        roleDefinitionRecord: { lastPermissionVersion: 3 },
      },
    ]);
  });
});
