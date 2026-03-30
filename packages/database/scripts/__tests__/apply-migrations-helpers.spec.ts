// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyIgnorableTenantMigrationError,
  executeTenantMigrationStatements,
  formatStatementPreview,
  formatTenantMigrationSkipReasonCounts,
  getErrorMessage,
  isIgnorableTenantMigrationError,
  splitSqlStatements,
} from '../apply-migrations-helpers';

describe('splitSqlStatements', () => {
  it('keeps dollar-quoted bodies intact while splitting normal statements', () => {
    const sql = `
      CREATE TABLE foo (id INT);

      DO $$
      BEGIN
        PERFORM 1;
        PERFORM 2;
      END $$;

      ALTER TABLE foo ADD COLUMN bar TEXT;
    `;

    assert.deepEqual(splitSqlStatements(sql), [
      'CREATE TABLE foo (id INT);',
      'DO $$\n      BEGIN\n        PERFORM 1;\n        PERFORM 2;\n      END $$;',
      'ALTER TABLE foo ADD COLUMN bar TEXT;',
    ]);
  });

  it('keeps tagged dollar-quoted bodies intact', () => {
    const sql = `
      DO $fn$
      BEGIN
        EXECUTE 'CREATE TABLE foo (id INT);';
        PERFORM 1;
      END
      $fn$;

      CREATE INDEX foo_idx ON foo(id);
    `;

    assert.deepEqual(splitSqlStatements(sql), [
      "DO $fn$\n      BEGIN\n        EXECUTE 'CREATE TABLE foo (id INT);';\n        PERFORM 1;\n      END\n      $fn$;",
      'CREATE INDEX foo_idx ON foo(id);',
    ]);
  });

  it('does not split semicolons inside single-quoted strings', () => {
    const sql = `
      DO $$
      BEGIN
        EXECUTE format('
          CREATE OR REPLACE FUNCTION %I.test_fn()
          RETURNS TRIGGER AS $func$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $func$ LANGUAGE plpgsql', 'tenant_test');
      END $$;

      SELECT 1;
    `;

    assert.deepEqual(splitSqlStatements(sql), [
      "DO $$\n      BEGIN\n        EXECUTE format('\n          CREATE OR REPLACE FUNCTION %I.test_fn()\n          RETURNS TRIGGER AS $func$\n          BEGIN\n            NEW.updated_at = now();\n            RETURN NEW;\n          END;\n          $func$ LANGUAGE plpgsql', 'tenant_test');\n      END $$;",
      'SELECT 1;',
    ]);
  });
});

describe('isIgnorableTenantMigrationError', () => {
  it('keeps create/add idempotency conflicts ignorable', () => {
    assert.equal(
      classifyIgnorableTenantMigrationError(
        'CREATE INDEX foo_idx ON tenant_template.foo(id);',
        'relation "foo_idx" already exists'
      ),
      'create_exists'
    );
    assert.equal(
      isIgnorableTenantMigrationError(
        'CREATE INDEX foo_idx ON tenant_template.foo(id);',
        'relation "foo_idx" already exists'
      ),
      true
    );

    assert.equal(
      classifyIgnorableTenantMigrationError(
        'ALTER TABLE tenant_template.foo ADD COLUMN bar TEXT;',
        'column "bar" of relation "foo" already exists'
      ),
      'alter_table_add_exists'
    );
    assert.equal(
      isIgnorableTenantMigrationError(
        'ALTER TABLE tenant_template.foo ADD COLUMN bar TEXT;',
        'column "bar" of relation "foo" already exists'
      ),
      true
    );
  });

  it('keeps drop/rename replay conflicts ignorable', () => {
    assert.equal(
      isIgnorableTenantMigrationError(
        'ALTER INDEX tenant_template.idx_old RENAME TO idx_new;',
        'relation "tenant_template.idx_old" does not exist'
      ),
      true
    );

    assert.equal(
      isIgnorableTenantMigrationError(
        'ALTER TABLE tenant_template.policy DROP CONSTRAINT policy_resource_id_action_effect_key;',
        'constraint "policy_resource_id_action_effect_key" of relation "policy" does not exist'
      ),
      true
    );

    assert.equal(
      isIgnorableTenantMigrationError(
        'ALTER TABLE "tenant_template"."membership_class" DROP CONSTRAINT IF EXISTS "membership_class_owner_type_owner_id_code_key";',
        'constraint "membership_class_owner_type_owner_id_code_key" of relation "membership_class" does not exist'
      ),
      true
    );

    assert.equal(
      isIgnorableTenantMigrationError(
        'ALTER INDEX "tenant_template"."idx_membership_record_valid_to" RENAME TO "membership_record_valid_to_idx";',
        'relation "tenant_template.idx_membership_record_valid_to" does not exist'
      ),
      true
    );
  });

  it('does not ignore duplicate-key data conflicts anymore', () => {
    assert.equal(
      isIgnorableTenantMigrationError(
        "INSERT INTO tenant_template.role (code) VALUES ('ADMIN');",
        'duplicate key value violates unique constraint "role_code_key"'
      ),
      false
    );
  });

  it('does not ignore unsupported statement/error combinations', () => {
    assert.equal(
      isIgnorableTenantMigrationError(
        'UPDATE tenant_template.role SET version = version + 1;',
        'relation "tenant_template.role" does not exist'
      ),
      false
    );
    assert.equal(
      isIgnorableTenantMigrationError(
        'CREATE TABLE tenant_template.foo (id INT);',
        'permission denied for schema tenant_template'
      ),
      false
    );
  });
});

describe('formatStatementPreview', () => {
  it('normalizes whitespace and truncates long statements', () => {
    assert.equal(
      formatStatementPreview(
        'ALTER   TABLE tenant_template.customer_profile\nADD COLUMN example TEXT;',
        40,
      ),
      'ALTER TABLE tenant_template.customer_...',
    );
  });
});

describe('formatTenantMigrationSkipReasonCounts', () => {
  it('formats skip reasons in stable order', () => {
    assert.equal(
      formatTenantMigrationSkipReasonCounts({
        drop_missing: 2,
        create_exists: 3,
        alter_index_rename_missing: 1,
      }),
      'create/already_exists=3, drop/does_not_exist=2, alter_index_rename/does_not_exist=1'
    );
  });
});

describe('getErrorMessage', () => {
  it('extracts messages from Error and message-like values', () => {
    assert.equal(getErrorMessage(new Error('boom')), 'boom');
    assert.equal(getErrorMessage({ message: 'nope' }), 'nope');
    assert.equal(getErrorMessage('plain failure'), 'plain failure');
  });
});

describe('executeTenantMigrationStatements', () => {
  it('counts success and skipped statements while ignoring pure comments', async () => {
    const executed: string[] = [];

    const result = await executeTenantMigrationStatements({
      statements: [
        '-- comment only',
        'CREATE TABLE tenant_template.foo (id INT);',
        'ALTER TABLE tenant_template.foo ADD COLUMN bar TEXT;',
      ],
      targetSchema: 'tenant_test',
      migrationName: '20260330_test',
      executeStatement: async (statement) => {
        executed.push(statement);

        if (statement.includes('ADD COLUMN')) {
          throw new Error('column "bar" of relation "foo" already exists');
        }
      },
    });

    assert.deepEqual(result, {
      success: 1,
      skipped: 1,
      errors: 0,
      skippedByReason: {
        alter_table_add_exists: 1,
      },
    });
    assert.deepEqual(executed, [
      'CREATE TABLE tenant_template.foo (id INT);',
      'ALTER TABLE tenant_template.foo ADD COLUMN bar TEXT;',
    ]);
  });

  it('reports non-ignorable errors with schema, migration, and statement preview', async () => {
    const details: Array<{
      migrationName: string;
      targetSchema: string;
      statementPreview: string;
      message: string;
    }> = [];

    const result = await executeTenantMigrationStatements({
      statements: [
        "INSERT INTO tenant_template.role (code) VALUES ('ADMIN');",
      ],
      targetSchema: 'tenant_prod',
      migrationName: '20260330_role_backfill',
      executeStatement: async () => {
        throw new Error('duplicate key value violates unique constraint "role_code_key"');
      },
      onNonIgnorableError: (detail) => {
        details.push({
          migrationName: detail.migrationName,
          targetSchema: detail.targetSchema,
          statementPreview: detail.statementPreview,
          message: detail.message,
        });
      },
    });

    assert.deepEqual(result, {
      success: 0,
      skipped: 0,
      errors: 1,
      skippedByReason: {},
    });
    assert.deepEqual(details, [
      {
        migrationName: '20260330_role_backfill',
        targetSchema: 'tenant_prod',
        statementPreview: "INSERT INTO tenant_template.role (code) VALUES ('ADMIN');",
        message: 'duplicate key value violates unique constraint "role_code_key"',
      },
    ]);
  });

  it('aggregates multiple skip reasons in the execution summary', async () => {
    const result = await executeTenantMigrationStatements({
      statements: [
        'CREATE INDEX foo_idx ON tenant_template.foo(id);',
        'ALTER INDEX tenant_template.idx_old RENAME TO idx_new;',
      ],
      targetSchema: 'tenant_test',
      migrationName: '20260330_multi_skip',
      executeStatement: async (statement) => {
        if (statement.startsWith('CREATE INDEX')) {
          throw new Error('relation "foo_idx" already exists');
        }

        throw new Error('relation "tenant_template.idx_old" does not exist');
      },
    });

    assert.deepEqual(result, {
      success: 0,
      skipped: 2,
      errors: 0,
      skippedByReason: {
        create_exists: 1,
        alter_index_rename_missing: 1,
      },
    });
  });
});
