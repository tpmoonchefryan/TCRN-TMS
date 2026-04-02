// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// sort-imports-ignore
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyIgnorableTenantMigrationError,
  countTenantMigrationSkips,
  evaluateApplyMigrationsExitStatus,
  executeTenantMigrationStatements,
  formatStatementPreview,
  formatTenantMigrationDriftWatchSkipReasonCounts,
  formatTenantMigrationSkipReasonCounts,
  getErrorMessage,
  isIgnorableTenantMigrationError,
  parseApplyMigrationsCliArgs,
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

  it('ignores apostrophes inside line comments when splitting statements', () => {
    const sql = `-- Default value: 'auto' (Let's Encrypt auto-provisioning)
ALTER TABLE tenant_template.talent
  ADD COLUMN IF NOT EXISTS custom_domain_ssl_mode VARCHAR(32) NOT NULL DEFAULT 'auto';

-- Add column to other schemas
DO $$
BEGIN
  PERFORM 1;
END $$;
`;

    assert.deepEqual(splitSqlStatements(sql), [
      "-- Default value: 'auto' (Let's Encrypt auto-provisioning)\nALTER TABLE tenant_template.talent\n  ADD COLUMN IF NOT EXISTS custom_domain_ssl_mode VARCHAR(32) NOT NULL DEFAULT 'auto';",
      '-- Add column to other schemas\nDO $$\nBEGIN\n  PERFORM 1;\nEND $$;',
    ]);
  });

  it('does not split semicolons inside block comments', () => {
    const sql = `/* comment with ; semicolon */
CREATE TABLE foo (id INT);

/* another ; comment */
ALTER TABLE foo ADD COLUMN bar TEXT;
`;

    assert.deepEqual(splitSqlStatements(sql), [
      '/* comment with ; semicolon */\nCREATE TABLE foo (id INT);',
      '/* another ; comment */\nALTER TABLE foo ADD COLUMN bar TEXT;',
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
      classifyIgnorableTenantMigrationError(
        'DROP TABLE tenant_template.legacy_export_job;',
        'table "legacy_export_job" does not exist'
      ),
      'drop_table_missing'
    );

    assert.equal(
      classifyIgnorableTenantMigrationError(
        'DROP INDEX tenant_template.foo_idx;',
        'index "tenant_template.foo_idx" does not exist'
      ),
      'drop_index_missing'
    );

    assert.equal(
      classifyIgnorableTenantMigrationError(
        'ALTER TABLE tenant_template.policy DROP CONSTRAINT policy_resource_id_action_effect_key;',
        'constraint "policy_resource_id_action_effect_key" of relation "policy" does not exist'
      ),
      'alter_table_drop_constraint_missing'
    );

    assert.equal(
      classifyIgnorableTenantMigrationError(
        'ALTER TABLE tenant_template.export_job DROP COLUMN legacy_file_path;',
        'column "legacy_file_path" of relation "export_job" does not exist'
      ),
      'alter_table_drop_column_missing'
    );

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

  it('treats proven healthy-replay create-index and rename-target conflicts as ignorable', () => {
    assert.equal(
      classifyIgnorableTenantMigrationError(
        'CREATE INDEX IF NOT EXISTS idx_homepage_version_is_published ON tenant_template.homepage_version(is_published);',
        'column "is_published" does not exist'
      ),
      'create_index_target_missing'
    );

    assert.equal(
      classifyIgnorableTenantMigrationError(
        '-- RenameIndex\nALTER INDEX "tenant_template"."idx_marshmallow_message_talent_id" RENAME TO "marshmallow_message_talent_id_idx";',
        'relation "marshmallow_message_talent_id_idx" already exists'
      ),
      'alter_index_rename_exists'
    );

    assert.equal(
      isIgnorableTenantMigrationError(
        '-- RenameIndex\nALTER INDEX "tenant_template"."idx_marshmallow_message_talent_id" RENAME TO "marshmallow_message_talent_id_idx";',
        'relation "marshmallow_message_talent_id_idx" already exists'
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
    assert.equal(
      isIgnorableTenantMigrationError(
        'CREATE INDEX IF NOT EXISTS foo_idx ON tenant_template.foo(id);',
        'relation "tenant_template.foo" does not exist'
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
        40
      ),
      'ALTER TABLE tenant_template.customer_...'
    );
  });
});

describe('formatTenantMigrationSkipReasonCounts', () => {
  it('formats skip reasons in stable order', () => {
    assert.equal(
      formatTenantMigrationSkipReasonCounts({
        drop_index_missing: 2,
        create_exists: 3,
        alter_index_rename_missing: 1,
      }),
      'create/already_exists=3, drop_index/does_not_exist=2, alter_index_rename/does_not_exist=1'
    );
  });
});

describe('formatTenantMigrationDriftWatchSkipReasonCounts', () => {
  it('formats drift-watch skip reasons in stable order', () => {
    assert.equal(
      formatTenantMigrationDriftWatchSkipReasonCounts({
        drop_table_missing: 1,
        create_exists: 99,
        alter_table_drop_constraint_missing: 3,
      }),
      'drop_table/does_not_exist=1, alter_table_drop_constraint/does_not_exist=3'
    );
  });
});

describe('countTenantMigrationSkips', () => {
  it('counts all reasons or a selected subset', () => {
    assert.equal(
      countTenantMigrationSkips({
        create_exists: 2,
        alter_table_drop_column_missing: 3,
      }),
      5
    );

    assert.equal(
      countTenantMigrationSkips(
        {
          create_exists: 2,
          alter_table_drop_column_missing: 3,
        },
        ['alter_table_drop_column_missing']
      ),
      3
    );
  });
});

describe('parseApplyMigrationsCliArgs', () => {
  it('accepts the opt-in drift-watch strict mode flag', () => {
    assert.deepEqual(parseApplyMigrationsCliArgs(['--', '--fail-on-drift-watch-skips']), {
      failOnDriftWatchSkips: true,
      printSchemaSkipDetails: false,
    });
  });

  it('accepts the schema skip detail flag independently or together with strict mode', () => {
    assert.deepEqual(parseApplyMigrationsCliArgs(['--print-schema-skip-details']), {
      failOnDriftWatchSkips: false,
      printSchemaSkipDetails: true,
    });

    assert.deepEqual(
      parseApplyMigrationsCliArgs([
        '--',
        '--fail-on-drift-watch-skips',
        '--print-schema-skip-details',
      ]),
      {
        failOnDriftWatchSkips: true,
        printSchemaSkipDetails: true,
      }
    );
  });

  it('keeps defaults disabled when no flags are provided', () => {
    assert.deepEqual(parseApplyMigrationsCliArgs([]), {
      failOnDriftWatchSkips: false,
      printSchemaSkipDetails: false,
    });
  });

  it('rejects unknown arguments', () => {
    assert.throws(
      () => parseApplyMigrationsCliArgs(['--unexpected']),
      /Unknown argument: --unexpected/
    );
  });
});

describe('evaluateApplyMigrationsExitStatus', () => {
  it('keeps drift-watch skips non-fatal when strict mode is disabled', () => {
    assert.deepEqual(
      evaluateApplyMigrationsExitStatus({
        totalErrors: 0,
        totalSkippedByReason: {
          drop_table_missing: 2,
        },
        failOnDriftWatchSkips: false,
      }),
      {
        shouldFail: false,
        driftWatchSkips: 2,
        reasons: [],
      }
    );
  });

  it('fails on drift-watch skips only when strict mode is enabled', () => {
    assert.deepEqual(
      evaluateApplyMigrationsExitStatus({
        totalErrors: 0,
        totalSkippedByReason: {
          drop_index_missing: 1,
          create_exists: 5,
        },
        failOnDriftWatchSkips: true,
      }),
      {
        shouldFail: true,
        driftWatchSkips: 1,
        reasons: ['drift_watch_skips=1'],
      }
    );
  });

  it('always fails when non-ignorable errors are present', () => {
    assert.deepEqual(
      evaluateApplyMigrationsExitStatus({
        totalErrors: 2,
        totalSkippedByReason: {
          create_exists: 3,
        },
        failOnDriftWatchSkips: false,
      }),
      {
        shouldFail: true,
        driftWatchSkips: 0,
        reasons: ['non_ignorable_errors=2'],
      }
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

  it('skips block-comment-only statements', async () => {
    const executed: string[] = [];

    const result = await executeTenantMigrationStatements({
      statements: ['/* comment only; still no SQL */', 'CREATE TABLE tenant_template.foo (id INT);'],
      targetSchema: 'tenant_test',
      migrationName: '20260330_block_comment_only',
      executeStatement: async (statement) => {
        executed.push(statement);
      },
    });

    assert.deepEqual(result, {
      success: 1,
      skipped: 0,
      errors: 0,
      skippedByReason: {},
    });
    assert.deepEqual(executed, ['CREATE TABLE tenant_template.foo (id INT);']);
  });

  it('reports non-ignorable errors with schema, migration, and statement preview', async () => {
    const details: Array<{
      migrationName: string;
      targetSchema: string;
      statementPreview: string;
      message: string;
    }> = [];

    const result = await executeTenantMigrationStatements({
      statements: ["INSERT INTO tenant_template.role (code) VALUES ('ADMIN');"],
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
        'DROP INDEX tenant_template.idx_old;',
      ],
      targetSchema: 'tenant_test',
      migrationName: '20260330_multi_skip',
      executeStatement: async (statement) => {
        if (statement.startsWith('CREATE INDEX')) {
          throw new Error('relation "foo_idx" already exists');
        }

        throw new Error('index "tenant_template.idx_old" does not exist');
      },
    });

    assert.deepEqual(result, {
      success: 0,
      skipped: 2,
      errors: 0,
      skippedByReason: {
        create_exists: 1,
        drop_index_missing: 1,
      },
    });
  });

  it('classifies comment-prefixed rename and missing-column index replay conflicts', async () => {
    const result = await executeTenantMigrationStatements({
      statements: [
        '-- RenameIndex\nALTER INDEX "tenant_template"."idx_marshmallow_message_talent_id" RENAME TO "marshmallow_message_talent_id_idx";',
        'CREATE INDEX IF NOT EXISTS idx_homepage_version_is_published ON tenant_template.homepage_version(is_published);',
      ],
      targetSchema: 'tenant_test',
      migrationName: '20260330_replay_false_positives',
      executeStatement: async (statement) => {
        if (statement.startsWith('-- RenameIndex')) {
          throw new Error('relation "marshmallow_message_talent_id_idx" already exists');
        }

        throw new Error('column "is_published" does not exist');
      },
    });

    assert.deepEqual(result, {
      success: 0,
      skipped: 2,
      errors: 0,
      skippedByReason: {
        create_index_target_missing: 1,
        alter_index_rename_exists: 1,
      },
    });
  });
});
