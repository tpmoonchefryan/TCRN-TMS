import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertInitialAdminCompatibilityReadback,
  readInitialAdminCompatibilityReadback,
  syncSchema,
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

function createFailClosedContractRunner() {
  const queries: string[] = [];
  const executes: string[] = [];

  return {
    queries,
    executes,
    async $transaction<T>(callback: (tx: typeof this) => Promise<T>): Promise<T> {
      return callback(this);
    },
    async $executeRawUnsafe(query: string, ..._values: unknown[]): Promise<number> {
      executes.push(query);
      return 1;
    },
    async $queryRawUnsafe<T = unknown>(query: string, ..._values: unknown[]): Promise<T> {
      queries.push(query);

      if (query.includes('information_schema.schemata')) {
        return [{ exists: true }] as T;
      }

      if (query.includes('information_schema.tables')) {
        return [{ exists: true }] as T;
      }

      if (query.includes('FROM "tenant_acme".resource')) {
        return [{ count: 0n }] as T;
      }

      if (query.includes('FROM "tenant_acme".policy')) {
        return [{ count: 0n }] as T;
      }

      if (
        query.includes('FROM "tenant_acme".role_policy') &&
        !query.includes('JOIN "tenant_acme".role')
      ) {
        return [{ count: 0n }] as T;
      }

      if (query.includes('SELECT id FROM "tenant_acme".role WHERE code = $1 LIMIT 1')) {
        return [{ id: 'initial-admin-role' }] as T;
      }

      if (query.includes('SELECT su.id')) {
        return [] as T;
      }

      if (query.includes('WHERE is_system = true')) {
        return [{ count: 4n }] as T;
      }

      if (query.includes('AND is_system = true')) {
        return [{ count: 3n }] as T;
      }

      if (query.includes('AND is_system = false')) {
        return [{ count: 0n }] as T;
      }

      if (query.includes('JOIN "tenant_acme".role r ON r.id = ur.role_id')) {
        return [{ count: 0n }] as T;
      }

      if (query.includes('extra_data')) {
        return [] as T;
      }

      if (query.includes('FROM "tenant_acme".role')) {
        return [{ count: 4n }] as T;
      }

      throw new Error(`Unexpected query: ${query}`);
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

  it('fails closed instead of granting Initial Admin to an arbitrary active non-admin user', async () => {
    const runner = createFailClosedContractRunner();

    await assert.rejects(
      syncSchema(runner as never, 'tenant_acme', 'contract'),
      /active tenant-scope Initial Admin assignment/,
    );

    assert.equal(
      runner.queries.some(
        (query) =>
          query.includes('FROM "tenant_acme".system_user') &&
          !query.includes('JOIN "tenant_acme".user_role'),
      ),
      false,
    );
    assert.equal(
      runner.executes.some(
        (query) => query.includes('UPDATE "tenant_acme".role') && query.includes('is_system = false'),
      ),
      false,
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
