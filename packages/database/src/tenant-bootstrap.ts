// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PrismaClient } from '@prisma/client';

export const TENANT_TEMPLATE_DIRECT_COPY_TABLES = [
  'resource',
  'social_platform',
  'role',
  'policy',
  'role_policy',
  'pii_service_config',
  'profile_store',
  'blocklist_entry',
  'external_blocklist_pattern',
] as const;

const TENANT_MEMBERSHIP_CONFIG_TABLES = [
  'membership_class',
  'membership_type',
  'membership_level',
] as const;

function hasAllTables(
  availableTables: ReadonlySet<string> | undefined,
  requiredTables: readonly string[]
): boolean {
  return availableTables ? requiredTables.every((table) => availableTables.has(table)) : true;
}

export async function copyTenantTemplateSeedData(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[]
): Promise<void> {
  const availableTableSet = availableTables ? new Set(availableTables) : undefined;

  for (const table of TENANT_TEMPLATE_DIRECT_COPY_TABLES) {
    if (availableTableSet && !availableTableSet.has(table)) {
      continue;
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."${table}"
      SELECT * FROM tenant_template."${table}"
      ON CONFLICT DO NOTHING
    `);
  }

  if (!hasAllTables(availableTableSet, TENANT_MEMBERSHIP_CONFIG_TABLES)) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_class
      (id, owner_type, owner_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, sort_order,
       is_active, is_force_use, is_system, created_at, updated_at,
       created_by, updated_by, version)
    SELECT
      gen_random_uuid(),
      template_class.owner_type,
      template_class.owner_id,
      template_class.code,
      template_class.name_en,
      template_class.name_zh,
      template_class.name_ja,
      template_class.description_en,
      template_class.description_zh,
      template_class.description_ja,
      template_class.sort_order,
      template_class.is_active,
      template_class.is_force_use,
      template_class.is_system,
      template_class.created_at,
      template_class.updated_at,
      template_class.created_by,
      template_class.updated_by,
      template_class.version
    FROM tenant_template.membership_class template_class
    ON CONFLICT (code) DO UPDATE SET
      owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_type
      (id, membership_class_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, external_control,
       default_renewal_days, sort_order, is_active, is_force_use, is_system,
       created_at, updated_at, created_by, updated_by, version)
    SELECT
      gen_random_uuid(),
      target_class.id,
      template_type.code,
      template_type.name_en,
      template_type.name_zh,
      template_type.name_ja,
      template_type.description_en,
      template_type.description_zh,
      template_type.description_ja,
      template_type.external_control,
      template_type.default_renewal_days,
      template_type.sort_order,
      template_type.is_active,
      template_type.is_force_use,
      template_type.is_system,
      template_type.created_at,
      template_type.updated_at,
      template_type.created_by,
      template_type.updated_by,
      template_type.version
    FROM tenant_template.membership_type template_type
    JOIN tenant_template.membership_class template_class
      ON template_class.id = template_type.membership_class_id
    JOIN "${schemaName}".membership_class target_class
      ON target_class.code = template_class.code
    ON CONFLICT (code) DO UPDATE SET
      membership_class_id = EXCLUDED.membership_class_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      external_control = EXCLUDED.external_control,
      default_renewal_days = EXCLUDED.default_renewal_days,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_level
      (id, membership_type_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, rank, color,
       badge_url, sort_order, is_active, is_force_use, is_system,
       created_at, updated_at, created_by, updated_by, version)
    SELECT
      gen_random_uuid(),
      target_type.id,
      template_level.code,
      template_level.name_en,
      template_level.name_zh,
      template_level.name_ja,
      template_level.description_en,
      template_level.description_zh,
      template_level.description_ja,
      template_level.rank,
      template_level.color,
      template_level.badge_url,
      template_level.sort_order,
      template_level.is_active,
      template_level.is_force_use,
      template_level.is_system,
      template_level.created_at,
      template_level.updated_at,
      template_level.created_by,
      template_level.updated_by,
      template_level.version
    FROM tenant_template.membership_level template_level
    JOIN tenant_template.membership_type template_type
      ON template_type.id = template_level.membership_type_id
    JOIN "${schemaName}".membership_type target_type
      ON target_type.code = template_type.code
    ON CONFLICT (code) DO UPDATE SET
      membership_type_id = EXCLUDED.membership_type_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      rank = EXCLUDED.rank,
      color = EXCLUDED.color,
      badge_url = EXCLUDED.badge_url,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);
}
