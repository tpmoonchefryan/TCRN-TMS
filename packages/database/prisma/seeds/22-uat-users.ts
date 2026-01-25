// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Test Users - Creates users with different roles for testing

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';
import { UatOrganizationResult } from './21-uat-organization';

export interface UatUsersResult {
  corpUsers: Record<string, string>;
  soloUsers: Record<string, string>;
}

// UAT test users password hash
// To change: generate a new hash using argon2.hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })
const UAT_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$eWdU+URfBlHb+0NUSAJzkg$X/uf1UQnNYSaDBNb8va2TqqFHrvolM9rcVhfOdqNiLs';

export async function seedUatUsers(
  prisma: PrismaClient,
  uatTenants: UatTenantResult,
  uatOrg: UatOrganizationResult
): Promise<UatUsersResult> {
  console.log('  → Creating UAT test users...');

  const corpUsers: Record<string, string> = {};
  const soloUsers: Record<string, string> = {};

  // ==========================================================================
  // UAT_CORP Users
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;

  // Get role IDs from the tenant schema (using new unified roles)
  const corpRoles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${corpSchema}".role WHERE code IN ('ADMIN', 'TALENT_MANAGER', 'CUSTOMER_MANAGER', 'CONTENT_MANAGER', 'VIEWER')`
  );
  const corpRoleMap: Record<string, string> = {};
  for (const role of corpRoles) {
    corpRoleMap[role.code] = role.id;
  }

  const corpUsersList = [
    // Tenant Admins (2) - ADMIN at tenant scope
    { username: 'corp_admin', email: 'corp.admin@uat.test', displayName: 'Corp Admin', role: 'ADMIN', scopeType: 'tenant', scopeId: uatTenants.corpTenant.id },
    { username: 'corp_admin2', email: 'corp.admin2@uat.test', displayName: 'Corp Admin 2', role: 'ADMIN', scopeType: 'tenant', scopeId: uatTenants.corpTenant.id },
    
    // Subsidiary Managers (2) - ADMIN at subsidiary scope
    { username: 'gaming_manager', email: 'gaming.manager@uat.test', displayName: 'Gaming Division Manager', role: 'ADMIN', scopeType: 'subsidiary', scopeId: uatOrg.subsidiaries['BU_GAMING'] },
    { username: 'music_manager', email: 'music.manager@uat.test', displayName: 'Music Division Manager', role: 'ADMIN', scopeType: 'subsidiary', scopeId: uatOrg.subsidiaries['BU_MUSIC'] },
    
    // Talent Managers (3) - TALENT_MANAGER at talent scope
    { username: 'sakura_manager', email: 'sakura.manager@uat.test', displayName: 'Sakura Manager', role: 'TALENT_MANAGER', scopeType: 'talent', scopeId: uatOrg.talents['TALENT_SAKURA'] },
    { username: 'luna_manager', email: 'luna.manager@uat.test', displayName: 'Luna Manager', role: 'TALENT_MANAGER', scopeType: 'talent', scopeId: uatOrg.talents['TALENT_LUNA'] },
    { username: 'hana_manager', email: 'hana.manager@uat.test', displayName: 'Hana Manager', role: 'TALENT_MANAGER', scopeType: 'talent', scopeId: uatOrg.talents['TALENT_HANA'] },
    
    // Read-only Users (3) - VIEWER at different scopes
    { username: 'viewer_hq', email: 'viewer.hq@uat.test', displayName: 'HQ Viewer', role: 'VIEWER', scopeType: 'tenant', scopeId: uatTenants.corpTenant.id },
    { username: 'viewer_gaming', email: 'viewer.gaming@uat.test', displayName: 'Gaming Viewer', role: 'VIEWER', scopeType: 'subsidiary', scopeId: uatOrg.subsidiaries['BU_GAMING'] },
    { username: 'viewer_sakura', email: 'viewer.sakura@uat.test', displayName: 'Sakura Viewer', role: 'VIEWER', scopeType: 'talent', scopeId: uatOrg.talents['TALENT_SAKURA'] },
  ];

  for (const user of corpUsersList) {
    // Create user
    const userResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".system_user (id, username, email, display_name, password_hash, preferred_language, is_active, force_reset, password_changed_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'en', true, false, now(), now(), now())
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      user.username, user.email, user.displayName, UAT_PASSWORD_HASH
    );
    corpUsers[user.username] = userResult[0].id;

    // Assign role
    const roleId = corpRoleMap[user.role];
    if (roleId && user.scopeId) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${corpSchema}".user_role (id, user_id, role_id, scope_type, scope_id, inherit)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::uuid, true)
         ON CONFLICT DO NOTHING`,
        userResult[0].id, roleId, user.scopeType, user.scopeId
      );
    }
  }

  console.log(`    ✓ Created ${corpUsersList.length} users in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO Users
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;

  // Get role IDs from the solo tenant schema (using new unified roles)
  const soloRoles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${soloSchema}".role WHERE code IN ('ADMIN', 'TALENT_MANAGER', 'CONTENT_MANAGER', 'VIEWER')`
  );
  const soloRoleMap: Record<string, string> = {};
  for (const role of soloRoles) {
    soloRoleMap[role.code] = role.id;
  }

  const soloUsersList = [
    // Owner (Admin at tenant scope)
    { username: 'solo_owner', email: 'solo.owner@uat.test', displayName: 'Solo Owner', role: 'ADMIN', scopeType: 'tenant', scopeId: uatTenants.soloTenant.id },
    
    // Content Manager at talent scope
    { username: 'solo_content', email: 'solo.content@uat.test', displayName: 'Solo Content Manager', role: 'CONTENT_MANAGER', scopeType: 'talent', scopeId: uatOrg.talents['TALENT_SOLO_STAR'] },
    
    // Viewer at tenant scope
    { username: 'solo_viewer', email: 'solo.viewer@uat.test', displayName: 'Solo Viewer', role: 'VIEWER', scopeType: 'tenant', scopeId: uatTenants.soloTenant.id },
  ];

  for (const user of soloUsersList) {
    // Create user
    const userResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${soloSchema}".system_user (id, username, email, display_name, password_hash, preferred_language, is_active, force_reset, password_changed_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'zh', true, false, now(), now(), now())
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      user.username, user.email, user.displayName, UAT_PASSWORD_HASH
    );
    soloUsers[user.username] = userResult[0].id;

    // Assign role
    const roleId = soloRoleMap[user.role];
    if (roleId && user.scopeId) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${soloSchema}".user_role (id, user_id, role_id, scope_type, scope_id, inherit)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::uuid, true)
         ON CONFLICT DO NOTHING`,
        userResult[0].id, roleId, user.scopeType, user.scopeId
      );
    }
  }

  console.log(`    ✓ Created ${soloUsersList.length} users in UAT_SOLO`);

  console.log('    📝 UAT User credentials:');
  console.log('       All users password: [set via UAT_PASSWORD_HASH constant]');
  console.log('       Corp Admin: UAT_CORP / corp_admin');
  console.log('       Solo Owner: UAT_SOLO / solo_owner');

  return { corpUsers, soloUsers };
}
