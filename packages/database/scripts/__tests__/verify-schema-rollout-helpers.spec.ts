// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  inferRolloutArtifactsFromMigrations,
  inferRolloutArtifactsFromSql,
} from '../verify-schema-rollout-helpers';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

function createTempMigrationsDir(files: Record<string, string>): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollout-artifacts-'));
  tempDirs.push(tempDir);

  for (const [migrationName, sql] of Object.entries(files)) {
    const migrationDir = path.join(tempDir, migrationName);
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(path.join(migrationDir, 'migration.sql'), sql, 'utf8');
  }

  return tempDir;
}

describe('inferRolloutArtifactsFromSql', () => {
  it('collects tenant table, add-column, create-index, and rename-index artifacts', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS tenant_template.export_job (
        id UUID PRIMARY KEY
      );

      ALTER TABLE tenant_template.export_job
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS file_path TEXT;

      CREATE INDEX IF NOT EXISTS export_job_status_idx
        ON tenant_template.export_job(status);

      ALTER INDEX tenant_template.idx_export_job_created_at
        RENAME TO export_job_created_at_idx;

      CREATE TABLE IF NOT EXISTS public.audit_log (
        id UUID PRIMARY KEY
      );
    `;

    assert.deepEqual(inferRolloutArtifactsFromSql(sql), {
      requiredTables: ['export_job'],
      requiredColumns: [
        { tableName: 'export_job', columnName: 'file_path' },
        { tableName: 'export_job', columnName: 'updated_at' },
      ],
      requiredIndexes: ['export_job_created_at_idx', 'export_job_status_idx'],
    });
  });

  it('supports quoted tenant identifiers and EXECUTE format tenant artifacts', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS "tenant_template"."user_scope_access" (
        "id" UUID PRIMARY KEY
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "user_scope_access_user_id_scope_type_scope_id_key"
        ON "tenant_template"."user_scope_access"("user_id", "scope_type", "scope_id");

      ALTER TABLE "tenant_template"."marshmallow_message"
        ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(512);

      DO $$
      BEGIN
        EXECUTE format('
          CREATE TABLE IF NOT EXISTS %I."user_scope_access" (
            "id" UUID PRIMARY KEY
          )',
          tenant_schema
        );

        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS "user_scope_access_user_id_idx" ON %I."user_scope_access"("user_id")',
          tenant_schema
        );
      END $$;
    `;

    assert.deepEqual(inferRolloutArtifactsFromSql(sql), {
      requiredTables: ['user_scope_access'],
      requiredColumns: [{ tableName: 'marshmallow_message', columnName: 'image_url' }],
      requiredIndexes: [
        'user_scope_access_user_id_idx',
        'user_scope_access_user_id_scope_type_scope_id_key',
      ],
    });
  });
});

describe('inferRolloutArtifactsFromMigrations', () => {
  it('merges and deduplicates inferred tenant artifacts across migrations', () => {
    const migrationsDir = createTempMigrationsDir({
      '20260324000001_add_export_job': `
        CREATE TABLE IF NOT EXISTS tenant_template.export_job (
          id UUID PRIMARY KEY
        );
        ALTER TABLE tenant_template.export_job
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
        CREATE INDEX IF NOT EXISTS export_job_status_idx
          ON tenant_template.export_job(status);
      `,
      '20260325000001_export_job_followup': `
        ALTER TABLE %I."export_job"
          ADD COLUMN IF NOT EXISTS "file_name" TEXT;
        CREATE INDEX IF NOT EXISTS export_job_status_idx
          ON %I."export_job"(status);
      `,
    });

    assert.deepEqual(
      inferRolloutArtifactsFromMigrations(
        ['20260325000001_export_job_followup', '20260324000001_add_export_job'],
        migrationsDir
      ),
      {
        sourceMigrations: ['20260324000001_add_export_job', '20260325000001_export_job_followup'],
        requiredTables: ['export_job'],
        requiredColumns: [
          { tableName: 'export_job', columnName: 'file_name' },
          { tableName: 'export_job', columnName: 'updated_at' },
        ],
        requiredIndexes: ['export_job_status_idx'],
      }
    );
  });
});
