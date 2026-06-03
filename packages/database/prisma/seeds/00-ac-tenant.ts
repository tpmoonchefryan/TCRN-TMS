// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// AC (Admin Console) tenant seed data

import { PrismaClient, Tenant } from '../../src/platform/prisma/client';
import { INITIAL_ADMIN_ROLE_CODE } from '../../../shared/src/rbac/catalog';
import { syncSeedTenantCapabilities } from './_module-capabilities';

export interface AcTenantResult {
  tenant: Tenant;
  schemaName: string;
}

/**
 * Create tenant schema by copying from tenant_template
 */
async function ensureTenantSchema(prisma: PrismaClient, schemaName: string): Promise<void> {
  // Check if schema exists
  const schemaExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) as exists`,
    schemaName
  );

  if (!schemaExists[0]?.exists) {
    console.log(`    → Creating schema ${schemaName}...`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  // Check if tables exist
  const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'system_user') as exists`,
    schemaName
  );

  if (!tableExists[0]?.exists) {
    console.log(`    → Copying tables from tenant_template to ${schemaName}...`);
    
    // Get all tables from tenant_template
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template' ORDER BY tablename`
    );

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
          (LIKE tenant_template."${tablename}" INCLUDING ALL)
        `);
      } catch (e) {
        // Ignore if table already exists
      }
    }
    console.log(`    ✓ Created ${tables.length} tables in ${schemaName}`);
  }
}

export async function seedAcTenant(prisma: PrismaClient): Promise<AcTenantResult> {
  console.log('  → Creating AC (Admin Console) tenant...');

  const tenantCode = 'AC';
  const schemaName = 'tenant_ac';

  // Create or update AC tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: tenantCode },
    update: {
      name: 'TCRN TMS Admin Console',
      tier: 'ac',
      isActive: true,
      settings: {
        timezone: 'UTC',
        defaultLanguage: 'en',
      },
    },
    create: {
      code: tenantCode,
      name: 'TCRN TMS Admin Console',
      schemaName,
      tier: 'ac',
      isActive: true,
      settings: {
        timezone: 'UTC',
        defaultLanguage: 'en',
      },
    },
  });

  await syncSeedTenantCapabilities(prisma, {
    tenant,
    enabledCapabilityCodes: [],
    note: 'AC tenant uses non-assignable platform/core capabilities; assignable tenant modules stay empty.',
  });

  // Ensure schema and tables exist
  await ensureTenantSchema(prisma, schemaName);

  console.log(`    ✓ AC tenant created: ${tenant.code} (${tenant.schemaName})`);

  return { tenant, schemaName };
}

// AC Admin user seed (called after roles are created)
export async function seedAcAdminUser(prisma: PrismaClient, acTenant: AcTenantResult): Promise<void> {
  console.log('  → Creating AC administrator user...');

  // AC Admin password hash
  // To change: generate a new hash using argon2.hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })
  const AC_ADMIN_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$8/WA27eZCbPXeL2FDbTEHQ$XZ7/l2jAJu6CTGs3ZtZxlmvUasP0rkO6CpUFybvWeu4';

  const schemaName = acTenant.schemaName;

  // Get Initial Admin role from tenant schema (not public)
  const initialAdminRoles = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".role WHERE code = $1 LIMIT 1`,
    INITIAL_ADMIN_ROLE_CODE
  );

  if (initialAdminRoles.length === 0) {
    // Create Initial Admin role in the tenant schema if the RBAC sync was skipped.
    console.log('    → Creating INITIAL_ADMIN role in tenant schema...');
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${schemaName}".role (id, code, name, description, is_system, is_active, created_at, updated_at, version)
        VALUES (gen_random_uuid(), $1, $2::jsonb, 'Built-in recovery role with every current RBAC permission', true, true, now(), now(), 1)
        ON CONFLICT (code) DO NOTHING
      `,
      INITIAL_ADMIN_ROLE_CODE,
      JSON.stringify({
        en: 'Initial Admin',
        zh_HANS: '初始管理员',
        zh_HANT: '初始管理员',
        ja: '初期管理者',
        ko: 'Initial Admin',
        fr: 'Initial Admin',
      }),
    );
  }

  const initialAdminRole = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".role WHERE code = $1 LIMIT 1`,
    INITIAL_ADMIN_ROLE_CODE
  );

  if (initialAdminRole.length === 0) {
    console.log('    ⚠ Failed to create INITIAL_ADMIN role, skipping AC admin user creation');
    return;
  }

  const roleId = initialAdminRole[0].id;

  // Create AC admin user directly in the tenant schema using raw SQL
  const existingUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".system_user WHERE username = $1 LIMIT 1`,
    'ac_admin'
  );

  let userId: string;

  if (existingUser.length > 0) {
    // Update existing user
    userId = existingUser[0].id;
    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".system_user 
       SET email = $1, display_name = $2, password_hash = $3, preferred_language = $4, 
           is_active = true, force_reset = false, password_changed_at = now(), updated_at = now()
       WHERE id = $5::uuid`,
      'admin@ac.tcrn-tms.local',
      'AC Administrator',
      AC_ADMIN_PASSWORD_HASH,
      'en',
      userId
    );
  } else {
    // Create new user with password_changed_at set to avoid immediate expiry
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".system_user 
       (id, username, email, display_name, password_hash, preferred_language, is_active, force_reset, password_changed_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, false, now(), now())
       RETURNING id`,
      'ac_admin',
      'admin@ac.tcrn-tms.local',
      'AC Administrator',
      AC_ADMIN_PASSWORD_HASH,
      'en'
    );
    userId = result[0].id;
  }

  // Assign Initial Admin role at AC tenant scope in the tenant schema
  const existingRoleAssignment = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".user_role 
     WHERE user_id = $1::uuid AND role_id = $2::uuid AND scope_type = 'tenant'
     LIMIT 1`,
    userId,
    roleId
  );

  if (existingRoleAssignment.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".user_role (id, user_id, role_id, scope_type, scope_id, inherit)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'tenant', NULL, true)`,
      userId,
      roleId
    );
  }

  console.log('    ✓ AC administrator user created');
  console.log('    📝 AC Admin credentials:');
  console.log('       Tenant Code: AC');
  console.log('       Username: ac_admin');
  console.log('       Password: [set via AC_ADMIN_PASSWORD_HASH constant]');
}
