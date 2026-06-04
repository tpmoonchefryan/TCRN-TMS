import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  executeRetirementPlan,
  type HistoricalRoleRetirementSummary,
} from '../retire-historical-roles';

function createSummary(mode: HistoricalRoleRetirementSummary['mode']): HistoricalRoleRetirementSummary {
  return {
    mode,
    filters: {
      schemas: [],
      roles: [],
      explicitRoleSelection: false,
    },
    plans: [],
    skipped: [],
    applied: [
      {
        schemaName: 'tenant_acme',
        roles: [
          {
            roleCode: 'ADMIN',
            roleId: '550e8400-e29b-41d4-a716-446655440000',
            status: 'blocked',
            reason: 'retained for audit history',
          },
        ],
      },
    ],
  };
}

describe('historical role retention review executor', () => {
  it('preserves dry-run review output without using the database connection', async () => {
    const prisma = new Proxy(
      {},
      {
        get() {
          throw new Error('database access is not expected for dry-run retention review');
        },
      },
    );

    const result = await executeRetirementPlan(prisma as never, createSummary('dry_run'));

    assert.deepEqual(result.applied, []);
    assert.equal(result.mode, 'dry_run');
  });

  it('blocks apply mode because role rows are retained for audit history', async () => {
    await assert.rejects(
      executeRetirementPlan({} as never, createSummary('apply')),
      /Role row hard deletion is disabled/,
    );
  });
});
