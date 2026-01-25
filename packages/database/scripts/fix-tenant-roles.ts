// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to fix tenant roles after role system refactor
// - Deactivates old hierarchical roles
// - Adds missing new functional roles
// - Copies role-policy mappings with effects

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New roles that should exist
const NEW_ROLES = [
  { code: 'PLATFORM_ADMIN', nameEn: 'Platform Administrator', nameZh: '平台管理员', nameJa: 'プラットフォーム管理者', description: 'AC tenant administrator with platform-wide access', isSystem: true },
  { code: 'ADMIN', nameEn: 'Administrator', nameZh: '管理员', nameJa: '管理者', description: 'Full access within assigned scope (tenant/subsidiary/talent)', isSystem: true },
  { code: 'TALENT_MANAGER', nameEn: 'Talent Manager', nameZh: '艺人经理', nameJa: 'タレントマネージャー', description: 'Manage talent operations, organization structure, and user assignments', isSystem: false },
  { code: 'CONTENT_MANAGER', nameEn: 'Content Manager', nameZh: '内容管理员', nameJa: 'コンテンツマネージャー', description: 'Homepage and Marshmallow management', isSystem: false },
  { code: 'CUSTOMER_MANAGER', nameEn: 'Customer Manager', nameZh: '客户经理', nameJa: '顧客マネージャー', description: 'Customer profile and membership management', isSystem: false },
  { code: 'VIEWER', nameEn: 'Viewer', nameZh: '只读访问者', nameJa: '閲覧者', description: 'Read-only access to resources within assigned scope', isSystem: false },
  { code: 'INTEGRATION_MANAGER', nameEn: 'Integration Manager', nameZh: '集成管理员', nameJa: '連携マネージャー', description: 'Full access to integration adapters, webhooks, and API consumers', isSystem: false },
];

// Old roles to deactivate
const OLD_ROLES = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'SUBSIDIARY_ADMIN',
  'TALENT_ADMIN',
  'CUSTOMER_VIEWER',
  'REPORT_MANAGER',
  'INTEGRATION_VIEWER',
  'INTEGRATION_ADMIN',
];

async function getAllTenantSchemas(includeTemplate = false): Promise<string[]> {
  const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY 
      CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END,
      schema_name
  `;
  if (includeTemplate) {
    return schemas.map(s => s.schema_name);
  }
  return schemas.filter(s => s.schema_name !== 'tenant_template').map(s => s.schema_name);
}

async function fixTenantRoles(schemaName: string, isTemplate = false): Promise<void> {
  console.log(`\n📦 Fixing roles in: ${schemaName}`);
  
  // 1. Deactivate old roles
  for (const roleCode of OLD_ROLES) {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".role 
      SET is_active = false, updated_at = now() 
      WHERE code = $1
    `, roleCode);
  }
  console.log(`   ✓ Deactivated ${OLD_ROLES.length} old roles`);
  
  // 2. Create/update new roles
  for (const role of NEW_ROLES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
      ON CONFLICT (code) DO UPDATE SET 
        name_en = EXCLUDED.name_en,
        name_zh = EXCLUDED.name_zh,
        name_ja = EXCLUDED.name_ja,
        description = EXCLUDED.description,
        is_active = true,
        updated_at = now()
    `, role.code, role.nameEn, role.nameZh, role.nameJa, role.description, role.isSystem);
  }
  console.log(`   ✓ Created/updated ${NEW_ROLES.length} new roles`);
  
  // 3. Copy role-policy mappings from tenant_template (skip for template itself)
  if (!isTemplate) {
    await copyRolePolicies(schemaName);
  } else {
    console.log(`   ⏭ Skipping role-policy copy for template (source schema)`);
  }
}

async function copyRolePolicies(schemaName: string): Promise<void> {
  // Get role IDs from tenant_template
  const templateRoles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM tenant_template.role WHERE is_active = true`
  );
  
  // Get role IDs from target schema
  const targetRoles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${schemaName}".role WHERE is_active = true`
  );
  
  const templateRoleMap = new Map(templateRoles.map(r => [r.code, r.id]));
  const targetRoleMap = new Map(targetRoles.map(r => [r.code, r.id]));
  
  // Get policies from target schema (they should already exist with same IDs)
  const targetPolicies = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".policy WHERE is_active = true`
  );
  const targetPolicyIds = new Set(targetPolicies.map(p => p.id));
  
  let copiedCount = 0;
  
  for (const role of NEW_ROLES) {
    const templateRoleId = templateRoleMap.get(role.code);
    const targetRoleId = targetRoleMap.get(role.code);
    
    if (!templateRoleId || !targetRoleId) continue;
    
    // Get role-policy mappings from template
    const templateMappings = await prisma.$queryRawUnsafe<Array<{ policyId: string; effect: string }>>(
      `SELECT policy_id as "policyId", effect FROM tenant_template.role_policy WHERE role_id = '${templateRoleId}'::uuid`
    );
    
    for (const mapping of templateMappings) {
      // Check if policy exists in target schema
      if (!targetPolicyIds.has(mapping.policyId)) continue;
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, effect, created_at)
        VALUES (gen_random_uuid(), '${targetRoleId}'::uuid, '${mapping.policyId}'::uuid, $1, now())
        ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect
      `, mapping.effect || 'grant');
      copiedCount++;
    }
  }
  
  console.log(`   ✓ Copied ${copiedCount} role-policy mappings`);
}

async function main() {
  console.log('🔧 Fixing tenant roles after role system refactor...\n');
  
  // Include tenant_template in the fix
  const schemas = await getAllTenantSchemas(true);
  console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}`);
  
  for (const schema of schemas) {
    const isTemplate = schema === 'tenant_template';
    await fixTenantRoles(schema, isTemplate);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Role fix complete!');
  console.log('   Run `pnpm db:refresh-snapshots` to update permission snapshots.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
