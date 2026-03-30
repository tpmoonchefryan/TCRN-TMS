// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
/* eslint-disable simple-import-sort/imports */
// sort-imports-ignore
import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import type { RollbackExportSummary } from '../export-historical-role-retirement-rollback';
import {
  formatRollbackExportSql,
  formatRollbackExportSummary,
  parseCliArgs,
  renderRollbackExportOutput,
} from '../export-historical-role-retirement-rollback';

function createSummary(): RollbackExportSummary {
  return {
    filters: {
      schemas: ['tenant_uat_corp'],
      roles: ['SUPER_ADMIN'],
    },
    exports: [
      {
        schemaName: 'tenant_uat_corp',
        roles: [
          {
            roleCode: 'SUPER_ADMIN',
            roleId: 'role-1',
            role: {
              id: 'role-1',
              code: 'SUPER_ADMIN',
              name_en: 'Super Admin',
              name_zh: '超级管理员',
              name_ja: 'スーパー管理者',
              description: 'Historical role',
              is_system: false,
              is_active: false,
              created_at: new Date('2026-03-30T00:00:00.000Z'),
              updated_at: new Date('2026-03-30T00:00:00.000Z'),
              created_by: null,
              updated_by: null,
              version: 1,
            },
            rolePolicies: [
              {
                id: 'rp-1',
                role_id: 'role-1',
                policy_id: 'policy-1',
                effect: 'grant',
                created_at: new Date('2026-03-30T00:00:00.000Z'),
                resource_code: 'log.integration',
                action: 'read',
              },
            ],
            sql: [
              '-- Rollback export for tenant_uat_corp:SUPER_ADMIN',
              'BEGIN;',
              `INSERT INTO "tenant_uat_corp".role (id, code) VALUES ('role-1', 'SUPER_ADMIN') ON CONFLICT (code) DO NOTHING;`,
              'COMMIT;',
              '',
            ].join('\n'),
          },
        ],
      },
    ],
  };
}

describe('parseCliArgs', () => {
  it('supports --sql output and de-duplicates schemas and roles', () => {
    const options = parseCliArgs([
      '--schema',
      'tenant_uat_corp',
      '--schema',
      'tenant_uat_corp',
      '--role',
      'SUPER_ADMIN',
      '--role',
      'SUPER_ADMIN',
      '--sql',
    ]);

    assert.deepEqual(options, {
      schemas: ['tenant_uat_corp'],
      roles: ['SUPER_ADMIN'],
      json: false,
      sql: true,
    });
  });

  it('rejects selecting both --json and --sql', () => {
    assert.throws(
      () =>
        parseCliArgs(['--schema', 'tenant_uat_corp', '--role', 'SUPER_ADMIN', '--json', '--sql']),
      /Choose at most one output flag: --json or --sql\./
    );
  });
});

describe('rollback exporter output rendering', () => {
  it('formats SQL output without falling back to summary text', () => {
    const summary = createSummary();
    const sql = formatRollbackExportSql(summary);

    assert.match(sql, /^-- Historical role retirement rollback export$/m);
    assert.match(sql, /^-- Schemas: tenant_uat_corp$/m);
    assert.match(sql, /^BEGIN;$/m);
    assert.match(sql, /INSERT INTO "tenant_uat_corp"\.role/);
    assert.doesNotMatch(sql, /^Schema:/m);
  });

  it('renders the correct branch for summary and sql output modes', () => {
    const summary = createSummary();

    assert.equal(
      formatRollbackExportSummary(summary),
      'Schema: tenant_uat_corp\n- SUPER_ADMIN: rolePolicies=1 roleId=role-1\n'
    );
    assert.equal(
      renderRollbackExportOutput(summary, { json: false, sql: false }),
      'Schema: tenant_uat_corp\n- SUPER_ADMIN: rolePolicies=1 roleId=role-1\n'
    );
    assert.equal(
      renderRollbackExportOutput(summary, { json: false, sql: true }),
      formatRollbackExportSql(summary)
    );
    assert.equal(
      renderRollbackExportOutput(summary, { json: true, sql: false }),
      `${JSON.stringify(summary, null, 2)}\n`
    );
  });
});
