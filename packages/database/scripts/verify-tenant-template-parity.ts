// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only tenant_template parity proof for local reset acceptance.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '../src/platform/prisma/client';
import { TENANT_TEMPLATE_DIRECT_COPY_TABLES } from '../src/platform/tenancy/template-bootstrap';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

const prisma = new PrismaClient();

const MEMBERSHIP_CONFIG_TABLES = [
  'membership_class',
  'membership_type',
  'membership_level',
] as const;

const REQUIRED_SEED_TABLES = [
  ...TENANT_TEMPLATE_DIRECT_COPY_TABLES,
  ...MEMBERSHIP_CONFIG_TABLES,
] as const;

interface CliOptions {
  json: boolean;
  schemas: string[];
}

interface TableColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  udtName: string;
  isNullable: string;
  columnDefault: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  datetimePrecision: number | null;
}

interface TableIndex {
  tableName: string;
  indexName: string;
  definition: string;
}

interface TableConstraint {
  tableName: string;
  constraintName: string;
  constraintType: string;
  definition: string;
}

interface SeedSignature {
  tableName: string;
  rowCount: number;
  signatures: string[];
}

interface SchemaParitySummary {
  schemaName: string;
  passed: boolean;
  failures: string[];
  tableCount: {
    expected: number;
    actual: number;
  };
  columnsCompared: number;
  indexesCompared: number;
  constraintsCompared: number;
  foreignKeysCompared: number;
  seedTables: SeedSignature[];
}

interface ParitySummary {
  baseSchema: string;
  targetSchemas: string[];
  passed: boolean;
  schemas: SchemaParitySummary[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    if (arg === '--schemas') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --schemas');
      }

      schemas.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
      index += 1;
      continue;
    }

    if (arg === '--schema') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --schema');
      }

      schemas.push(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const uniqueSchemas = [...new Set(schemas)];

  if (!uniqueSchemas.includes('tenant_template')) {
    uniqueSchemas.unshift('tenant_template');
  }

  if (uniqueSchemas.length < 2) {
    throw new Error('At least one target schema is required.');
  }

  return { json, schemas: uniqueSchemas };
}

function normalizeDefinition(schemaName: string, value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return value
    .replace(new RegExp(`"${schemaName}"\\.`, 'g'), '"<schema>".')
    .replace(new RegExp(`\\b${schemaName}\\.`, 'g'), '<schema>.');
}

function signature(value: unknown): string {
  return JSON.stringify(value);
}

function diffSets(expected: readonly string[], actual: readonly string[]): string[] {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item));
}

async function getTables(schemaName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ tableName: string }>>(
    `
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
    schemaName,
  );

  return rows.map((row) => row.tableName);
}

async function getColumns(schemaName: string): Promise<TableColumn[]> {
  const rows = await prisma.$queryRawUnsafe<TableColumn[]>(
    `
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable",
        column_default AS "columnDefault",
        character_maximum_length AS "characterMaximumLength",
        numeric_precision AS "numericPrecision",
        numeric_scale AS "numericScale",
        datetime_precision AS "datetimePrecision"
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, column_name
    `,
    schemaName,
  );

  return rows.map((row) => ({
    ...row,
    columnDefault: normalizeDefinition(schemaName, row.columnDefault),
  }));
}

async function getIndexes(schemaName: string): Promise<TableIndex[]> {
  const rows = await prisma.$queryRawUnsafe<TableIndex[]>(
    `
      SELECT
        tablename AS "tableName",
        indexname AS "indexName",
        indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = $1
      ORDER BY tablename, indexname
    `,
    schemaName,
  );

  return rows.map((row) => ({
    ...row,
    definition: normalizeDefinition(schemaName, row.definition) ?? '',
  }));
}

async function getConstraints(schemaName: string): Promise<TableConstraint[]> {
  const rows = await prisma.$queryRawUnsafe<TableConstraint[]>(
    `
      SELECT
        rel.relname AS "tableName",
        con.conname AS "constraintName",
        con.contype::text AS "constraintType",
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = $1
      ORDER BY rel.relname, con.conname
    `,
    schemaName,
  );

  return rows.map((row) => ({
    ...row,
    definition: normalizeDefinition(schemaName, row.definition) ?? '',
  }));
}

async function hasTable(schemaName: string, tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    schemaName,
    tableName,
  );

  return rows[0]?.exists ?? false;
}

async function getSeedSignatures(schemaName: string, tableName: string): Promise<SeedSignature> {
  if (!(await hasTable(schemaName, tableName))) {
    return { tableName, rowCount: 0, signatures: [] };
  }

  const queries: Record<string, string> = {
    resource: `SELECT code AS sig FROM "${schemaName}".resource ORDER BY code`,
    role: `SELECT code AS sig FROM "${schemaName}".role ORDER BY code`,
    policy: `
      SELECT r.code || ':' || p.action AS sig
      FROM "${schemaName}".policy p
      JOIN "${schemaName}".resource r ON r.id = p.resource_id
      ORDER BY sig
    `,
    role_policy: `
      SELECT role.code || ':' || resource.code || ':' || policy.action || ':' || role_policy.effect AS sig
      FROM "${schemaName}".role_policy role_policy
      JOIN "${schemaName}".role role ON role.id = role_policy.role_id
      JOIN "${schemaName}".policy policy ON policy.id = role_policy.policy_id
      JOIN "${schemaName}".resource resource ON resource.id = policy.resource_id
      ORDER BY sig
    `,
    pii_service_config: `SELECT code AS sig FROM "${schemaName}".pii_service_config ORDER BY code`,
    profile_store: `SELECT code AS sig FROM "${schemaName}".profile_store ORDER BY code`,
    artist_stage: `
      SELECT owner_type || ':' || COALESCE(owner_id::text, '') || ':' || code || ':' || artist_status_code || ':' || homepage_template_type_code AS sig
      FROM "${schemaName}".artist_stage
      ORDER BY sig
    `,
    public_presence_asset: `
      SELECT asset_kind || ':' || owner_type || ':' || COALESCE(owner_id::text, '') || ':' || code || ':' || status || ':' || COALESCE(template_type_code, '') || ':' || COALESCE(component_type, '') AS sig
      FROM "${schemaName}".public_presence_asset
      WHERE owner_type = 'system'
      ORDER BY sig
    `,
    public_presence_asset_revision: `
      SELECT asset.code || ':' || revision.revision_number::text || ':' || revision.source_hash || ':' || revision.runtime_contract_version || ':' || revision.artifact_status || ':' || revision.validation_state AS sig
      FROM "${schemaName}".public_presence_asset_revision revision
      JOIN "${schemaName}".public_presence_asset asset ON asset.id = revision.asset_id
      WHERE asset.owner_type = 'system'
      ORDER BY sig
    `,
    blocklist_entry: `
      SELECT pattern_type || ':' || pattern || ':' || COALESCE(category, '') || ':' || action AS sig
      FROM "${schemaName}".blocklist_entry
      ORDER BY sig
    `,
    external_blocklist_pattern: `
      SELECT pattern_type || ':' || pattern || ':' || COALESCE(category, '') || ':' || action AS sig
      FROM "${schemaName}".external_blocklist_pattern
      ORDER BY sig
    `,
    social_platform: `SELECT code AS sig FROM "${schemaName}".social_platform ORDER BY code`,
    membership_class: `SELECT code AS sig FROM "${schemaName}".membership_class ORDER BY code`,
    membership_type: `SELECT code AS sig FROM "${schemaName}".membership_type ORDER BY code`,
    membership_level: `SELECT code AS sig FROM "${schemaName}".membership_level ORDER BY code`,
  };

  const sql = queries[tableName];

  if (!sql) {
    return { tableName, rowCount: 0, signatures: [] };
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ sig: string }>>(sql);

  return {
    tableName,
    rowCount: rows.length,
    signatures: rows.map((row) => row.sig),
  };
}

function compareSignatures(
  failures: string[],
  label: string,
  expected: readonly unknown[],
  actual: readonly unknown[],
): void {
  const expectedSignatures = expected.map(signature).sort();
  const actualSignatures = actual.map(signature).sort();
  const missing = diffSets(expectedSignatures, actualSignatures);
  const extra = diffSets(actualSignatures, expectedSignatures);

  if (missing.length > 0 || extra.length > 0) {
    failures.push(`${label} mismatch: missing=${missing.length}, extra=${extra.length}`);
  }
}

async function verifyTargetSchema(
  targetSchema: string,
  base: {
    tables: string[];
    columns: TableColumn[];
    indexes: TableIndex[];
    constraints: TableConstraint[];
    seedTables: SeedSignature[];
  },
): Promise<SchemaParitySummary> {
  const failures: string[] = [];
  const [tables, columns, indexes, constraints, seedTables] = await Promise.all([
    getTables(targetSchema),
    getColumns(targetSchema),
    getIndexes(targetSchema),
    getConstraints(targetSchema),
    Promise.all(REQUIRED_SEED_TABLES.map((table) => getSeedSignatures(targetSchema, table))),
  ]);

  const missingTables = diffSets(base.tables, tables);
  const extraTables = diffSets(tables, base.tables);

  if (missingTables.length > 0 || extraTables.length > 0) {
    failures.push(
      `table mismatch: missing=${missingTables.join(',') || 'none'}, extra=${extraTables.join(',') || 'none'}`,
    );
  }

  compareSignatures(failures, 'column metadata', base.columns, columns);
  compareSignatures(failures, 'index metadata', base.indexes, indexes);
  compareSignatures(failures, 'constraint metadata', base.constraints, constraints);

  const baseSeedsByTable = new Map(base.seedTables.map((seedTable) => [seedTable.tableName, seedTable]));

  for (const seedTable of seedTables) {
    const expected = baseSeedsByTable.get(seedTable.tableName);

    if (!expected) {
      continue;
    }

    if (seedTable.rowCount !== expected.rowCount) {
      failures.push(
        `${seedTable.tableName} seed row count mismatch: expected=${expected.rowCount}, actual=${seedTable.rowCount}`,
      );
    }

    const missingSeedRows = diffSets(expected.signatures, seedTable.signatures);
    const extraSeedRows = diffSets(seedTable.signatures, expected.signatures);

    if (missingSeedRows.length > 0 || extraSeedRows.length > 0) {
      failures.push(
        `${seedTable.tableName} seed signature mismatch: missing=${missingSeedRows.length}, extra=${extraSeedRows.length}`,
      );
    }
  }

  return {
    schemaName: targetSchema,
    passed: failures.length === 0,
    failures,
    tableCount: {
      expected: base.tables.length,
      actual: tables.length,
    },
    columnsCompared: base.columns.length,
    indexesCompared: base.indexes.length,
    constraintsCompared: base.constraints.length,
    foreignKeysCompared: base.constraints.filter((constraint) => constraint.constraintType === 'f').length,
    seedTables,
  };
}

async function verifyParity(options: CliOptions): Promise<ParitySummary> {
  const [baseSchema, ...targetSchemas] = options.schemas;
  const [tables, columns, indexes, constraints, seedTables] = await Promise.all([
    getTables(baseSchema),
    getColumns(baseSchema),
    getIndexes(baseSchema),
    getConstraints(baseSchema),
    Promise.all(REQUIRED_SEED_TABLES.map((table) => getSeedSignatures(baseSchema, table))),
  ]);
  const base = { tables, columns, indexes, constraints, seedTables };
  const schemas = await Promise.all(
    targetSchemas.map((targetSchema) => verifyTargetSchema(targetSchema, base)),
  );

  return {
    baseSchema,
    targetSchemas,
    passed: schemas.every((schema) => schema.passed),
    schemas,
  };
}

function printSummary(summary: ParitySummary): void {
  console.log(`Tenant template parity: ${summary.passed ? 'passed' : 'failed'}`);

  for (const schema of summary.schemas) {
    console.log(`- ${schema.schemaName}: ${schema.passed ? 'passed' : 'failed'}`);
    console.log(
      `  tables=${schema.tableCount.actual}/${schema.tableCount.expected}, columns=${schema.columnsCompared}, indexes=${schema.indexesCompared}, constraints=${schema.constraintsCompared}, fks=${schema.foreignKeysCompared}`,
    );

    for (const seedTable of schema.seedTables) {
      console.log(`  seed ${seedTable.tableName}: rows=${seedTable.rowCount}`);
    }

    for (const failure of schema.failures) {
      console.log(`  failure: ${failure}`);
    }
  }
}

function isDirectRun(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const summary = await verifyParity(options);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(summary);
  }

  if (!summary.passed) {
    process.exitCode = 1;
  }
}

if (isDirectRun()) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Tenant template parity verification failed: ${message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
