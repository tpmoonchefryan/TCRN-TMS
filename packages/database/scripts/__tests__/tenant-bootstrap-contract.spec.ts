import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const DATABASE_ROOT = process.cwd();

function readDatabaseFile(...segments: string[]) {
  return readFileSync(join(DATABASE_ROOT, ...segments), 'utf8');
}

describe('tenant bootstrap contract', () => {
  it('uses the canonical tenant template bootstrap helper for runtime and CLI tenant creation', () => {
    const runtime = readDatabaseFile('src', 'platform', 'tenancy', 'schema-runtime.ts');
    const createTenantScript = readDatabaseFile('scripts', 'create-tenant-schema.ts');

    for (const source of [runtime, createTenantScript]) {
      assert.match(source, /copyTenantTemplateSeedData/);
      assert.match(source, /copyTenantTemplateForeignKeys/);
      assert.match(source, /alignTenantTemplateConstraintNames/);
      assert.match(source, /alignTenantTemplateIndexNames/);
    }
  });

  it('uses the canonical tenant template bootstrap helper for UAT schema bootstrap', () => {
    const uatTenantSeed = readDatabaseFile('prisma', 'seeds', '20-uat-tenant.ts');

    assert.match(uatTenantSeed, /copyTenantTemplateSeedData/);
    assert.match(uatTenantSeed, /copyTenantTemplateForeignKeys/);
    assert.match(uatTenantSeed, /alignTenantTemplateConstraintNames/);
    assert.match(uatTenantSeed, /alignTenantTemplateIndexNames/);
  });

  it('includes Public Presence contract seed tables in tenant template direct-copy data', () => {
    const templateBootstrap = readDatabaseFile('src', 'platform', 'tenancy', 'template-bootstrap.ts');

    for (const tableName of [
      'artist_stage',
      'public_presence_asset',
      'public_presence_asset_revision',
    ]) {
      assert.match(templateBootstrap, new RegExp(`'${tableName}'`));
    }
  });
});
