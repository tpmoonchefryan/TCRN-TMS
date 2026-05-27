import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const DATABASE_ROOT = process.cwd();

function readDatabaseFile(...segments: string[]) {
  return readFileSync(join(DATABASE_ROOT, ...segments), 'utf8');
}

describe('AC seed RBAC contract', () => {
  it('syncs the AC schema RBAC contract after tenant_template roles are seeded and before ac_admin assignment', () => {
    const baseSeed = readDatabaseFile('prisma', 'seeds', 'index.ts');

    assert.match(baseSeed, /syncRbacContractSchemas/);
    assert.match(baseSeed, /schemas:\s*\[acTenant\.schemaName\]/);
    assert.match(baseSeed, /skipTemplate:\s*true/);

    const rolesIndex = baseSeed.indexOf('await seedRolesAndResources(prisma)');
    const syncIndex = baseSeed.indexOf('await syncRbacContractSchemas(prisma');
    const adminIndex = baseSeed.indexOf('await seedAcAdminUser(prisma, acTenant)');

    assert.ok(rolesIndex >= 0, 'base seed must seed RBAC roles/resources');
    assert.ok(syncIndex > rolesIndex, 'AC RBAC sync must happen after tenant_template RBAC seed');
    assert.ok(adminIndex > syncIndex, 'ac_admin assignment must happen after AC RBAC sync');
  });
});
