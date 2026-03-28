// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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
});

describe('isIgnorableTenantMigrationError', () => {
  it('keeps create/add idempotency conflicts ignorable', () => {
    assert.equal(
      isIgnorableTenantMigrationError(
        'CREATE INDEX foo_idx ON tenant_template.foo(id);',
        'relation "foo_idx" already exists'
      ),
      true
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
