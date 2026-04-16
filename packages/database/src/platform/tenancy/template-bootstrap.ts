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

interface SchemaConstraintRow {
  tableName: string;
  constraintName: string;
  constraintType: string;
  definition: string;
}

interface SchemaIndexRow {
  tableName: string;
  indexName: string;
  definition: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeConstraintDefinition(
  definition: string,
  schemaName: string,
): string {
  const quotedSchemaPattern = new RegExp(
    `"${escapeRegExp(schemaName)}"\\.`,
    'g',
  );
  const unquotedSchemaPattern = new RegExp(
    `\\b${escapeRegExp(schemaName)}\\.`,
    'g',
  );

  return definition
    .replace(quotedSchemaPattern, '"<SCHEMA>".')
    .replace(unquotedSchemaPattern, '<SCHEMA>.');
}

function rewriteSchemaReference(
  definition: string,
  sourceSchemaName: string,
  targetSchemaName: string,
): string {
  const quotedSchemaPattern = new RegExp(
    `"${escapeRegExp(sourceSchemaName)}"\\.`,
    'g',
  );
  const unquotedSchemaPattern = new RegExp(
    `\\b${escapeRegExp(sourceSchemaName)}\\.`,
    'g',
  );
  const targetSchemaReference = `${quoteIdentifier(targetSchemaName)}.`;

  return definition
    .replace(quotedSchemaPattern, targetSchemaReference)
    .replace(unquotedSchemaPattern, targetSchemaReference);
}

function normalizeIndexDefinition(
  definition: string,
  schemaName: string,
): string {
  return normalizeConstraintDefinition(definition, schemaName).replace(
    /^CREATE(\s+UNIQUE)?\s+INDEX\s+"?[^"\s]+"?\s+ON\s+/i,
    (_, uniqueClause: string | undefined) =>
      `CREATE${uniqueClause ?? ''} INDEX <INDEX> ON `,
  );
}

function hasAllTables(
  availableTables: ReadonlySet<string> | undefined,
  requiredTables: readonly string[],
): boolean {
  return availableTables
    ? requiredTables.every((table) => availableTables.has(table))
    : true;
}

async function getSchemaConstraints(
  prisma: PrismaClient,
  schemaName: string,
  tableNames: readonly string[],
): Promise<SchemaConstraintRow[]> {
  if (tableNames.length === 0) {
    return [];
  }

  return prisma.$queryRawUnsafe<SchemaConstraintRow[]>(
    `
      SELECT
        rel.relname AS "tableName",
        con.conname AS "constraintName",
        con.contype AS "constraintType",
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = $1
        AND rel.relname = ANY($2::text[])
      ORDER BY rel.relname, con.conname
    `,
    schemaName,
    tableNames,
  );
}

async function getSchemaIndexes(
  prisma: PrismaClient,
  schemaName: string,
  tableNames: readonly string[],
): Promise<SchemaIndexRow[]> {
  if (tableNames.length === 0) {
    return [];
  }

  return prisma.$queryRawUnsafe<SchemaIndexRow[]>(
    `
      SELECT
        rel.relname AS "tableName",
        idx.relname AS "indexName",
        pg_get_indexdef(ind.indexrelid) AS definition
      FROM pg_index ind
      JOIN pg_class idx ON idx.oid = ind.indexrelid
      JOIN pg_class rel ON rel.oid = ind.indrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      LEFT JOIN pg_constraint con ON con.conindid = ind.indexrelid
      WHERE nsp.nspname = $1
        AND rel.relname = ANY($2::text[])
        AND con.oid IS NULL
      ORDER BY rel.relname, idx.relname
    `,
    schemaName,
    tableNames,
  );
}

async function resolveSchemaTableNames(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[],
): Promise<string[]> {
  if (availableTables) {
    return [...availableTables];
  }

  return (
    await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
        ORDER BY tablename
      `,
      schemaName,
    )
  ).map(({ tablename }) => tablename);
}

export async function copyTenantTemplateForeignKeys(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[],
): Promise<void> {
  const tableNames = await resolveSchemaTableNames(
    prisma,
    schemaName,
    availableTables,
  );

  if (tableNames.length === 0) {
    return;
  }

  const [templateConstraints, targetConstraints] = await Promise.all([
    getSchemaConstraints(prisma, 'tenant_template', tableNames),
    getSchemaConstraints(prisma, schemaName, tableNames),
  ]);

  const templateForeignKeys = templateConstraints.filter(
    (constraint) => constraint.constraintType === 'f',
  );
  const targetForeignKeys = targetConstraints.filter(
    (constraint) => constraint.constraintType === 'f',
  );
  const targetBySignature = new Map(
    targetForeignKeys.map((constraint) => [
      `${constraint.tableName}|${constraint.constraintType}|${normalizeConstraintDefinition(constraint.definition, schemaName)}`,
      constraint,
    ]),
  );
  const targetNames = new Set(
    targetForeignKeys.map((constraint) => constraint.constraintName),
  );

  for (const templateConstraint of templateForeignKeys) {
    const signature = `${templateConstraint.tableName}|${templateConstraint.constraintType}|${normalizeConstraintDefinition(templateConstraint.definition, 'tenant_template')}`;

    if (
      targetBySignature.has(signature) ||
      targetNames.has(templateConstraint.constraintName)
    ) {
      continue;
    }

    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${quoteIdentifier(schemaName)}.${quoteIdentifier(templateConstraint.tableName)} ADD CONSTRAINT ${quoteIdentifier(templateConstraint.constraintName)} ${rewriteSchemaReference(templateConstraint.definition, 'tenant_template', schemaName)}`,
    );

    targetNames.add(templateConstraint.constraintName);
    targetBySignature.set(signature, {
      ...templateConstraint,
      definition: rewriteSchemaReference(
        templateConstraint.definition,
        'tenant_template',
        schemaName,
      ),
    });
  }
}

export async function alignTenantTemplateConstraintNames(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[],
): Promise<void> {
  const tableNames = await resolveSchemaTableNames(
    prisma,
    schemaName,
    availableTables,
  );

  if (tableNames.length === 0) {
    return;
  }

  const [templateConstraints, targetConstraints] = await Promise.all([
    getSchemaConstraints(prisma, 'tenant_template', tableNames),
    getSchemaConstraints(prisma, schemaName, tableNames),
  ]);

  const targetBySignature = new Map(
    targetConstraints.map((constraint) => [
      `${constraint.tableName}|${constraint.constraintType}|${normalizeConstraintDefinition(constraint.definition, schemaName)}`,
      constraint,
    ]),
  );
  const targetNames = new Set(
    targetConstraints.map((constraint) => constraint.constraintName),
  );

  for (const templateConstraint of templateConstraints) {
    const signature = `${templateConstraint.tableName}|${templateConstraint.constraintType}|${normalizeConstraintDefinition(templateConstraint.definition, 'tenant_template')}`;
    const targetConstraint = targetBySignature.get(signature);

    if (!targetConstraint) {
      continue;
    }

    if (targetConstraint.constraintName === templateConstraint.constraintName) {
      continue;
    }

    if (targetNames.has(templateConstraint.constraintName)) {
      continue;
    }

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schemaName}"."${templateConstraint.tableName}" RENAME CONSTRAINT "${targetConstraint.constraintName}" TO "${templateConstraint.constraintName}"`,
    );

    targetNames.delete(targetConstraint.constraintName);
    targetNames.add(templateConstraint.constraintName);
  }
}

export async function alignTenantTemplateIndexNames(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[],
): Promise<void> {
  const tableNames = await resolveSchemaTableNames(
    prisma,
    schemaName,
    availableTables,
  );

  if (tableNames.length === 0) {
    return;
  }

  const [templateIndexes, targetIndexes] = await Promise.all([
    getSchemaIndexes(prisma, 'tenant_template', tableNames),
    getSchemaIndexes(prisma, schemaName, tableNames),
  ]);

  const templateGroups = new Map<string, SchemaIndexRow[]>();
  const targetGroups = new Map<string, SchemaIndexRow[]>();
  const targetNames = new Set(targetIndexes.map((index) => index.indexName));

  for (const templateIndex of templateIndexes) {
    const signature = `${templateIndex.tableName}|${normalizeIndexDefinition(templateIndex.definition, 'tenant_template')}`;
    const group = templateGroups.get(signature) ?? [];
    group.push(templateIndex);
    templateGroups.set(signature, group);
  }

  for (const targetIndex of targetIndexes) {
    const signature = `${targetIndex.tableName}|${normalizeIndexDefinition(targetIndex.definition, schemaName)}`;
    const group = targetGroups.get(signature) ?? [];
    group.push(targetIndex);
    targetGroups.set(signature, group);
  }

  for (const [signature, templateGroup] of templateGroups) {
    const targetGroup = targetGroups.get(signature);

    if (!targetGroup || targetGroup.length === 0) {
      continue;
    }

    const unmatchedTargets = [...targetGroup].sort((left, right) =>
      left.indexName.localeCompare(right.indexName),
    );
    const unmatchedTemplates: SchemaIndexRow[] = [];

    for (const templateIndex of [...templateGroup].sort((left, right) =>
      left.indexName.localeCompare(right.indexName),
    )) {
      const exactMatchIndex = unmatchedTargets.findIndex(
        (targetIndex) => targetIndex.indexName === templateIndex.indexName,
      );

      if (exactMatchIndex >= 0) {
        unmatchedTargets.splice(exactMatchIndex, 1);
        continue;
      }

      unmatchedTemplates.push(templateIndex);
    }

    for (const templateIndex of unmatchedTemplates) {
      const targetIndex = unmatchedTargets.shift();

      if (!targetIndex) {
        break;
      }

      if (targetNames.has(templateIndex.indexName)) {
        continue;
      }

      await prisma.$executeRawUnsafe(
        `ALTER INDEX ${quoteIdentifier(schemaName)}.${quoteIdentifier(targetIndex.indexName)} RENAME TO ${quoteIdentifier(templateIndex.indexName)}`,
      );

      targetNames.delete(targetIndex.indexName);
      targetNames.add(templateIndex.indexName);
    }
  }
}

export async function copyTenantTemplateSeedData(
  prisma: PrismaClient,
  schemaName: string,
  availableTables?: readonly string[],
): Promise<void> {
  const availableTableSet = availableTables
    ? new Set(availableTables)
    : undefined;

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
