// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only verification for schema rollout after migration deployments.
//
// Goal:
// - verify expected public Prisma migration records exist
// - verify required tenant-schema artifacts exist in tenant_template and active tenants

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

interface RequiredColumn {
  tableName: string;
  columnName: string;
}

interface CliOptions {
  migrations: string[];
  schemas: string[];
  requiredTables: string[];
  requiredColumns: RequiredColumn[];
  requiredIndexes: string[];
  json: boolean;
}

interface PublicMigrationVerification {
  migrationName: string;
  present: boolean;
  finished: boolean;
  rolledBack: boolean;
  attemptCount: number;
  successfulAttemptCount: number;
  rolledBackAttemptCount: number;
  passed: boolean;
  reason: string;
}

interface TableVerification {
  tableName: string;
  present: boolean;
}

interface ColumnVerification {
  tableName: string;
  columnName: string;
  present: boolean;
}

interface IndexVerification {
  indexName: string;
  present: boolean;
}

interface SchemaArtifactVerification {
  schemaName: string;
  schemaExists: boolean;
  passed: boolean;
  failures: string[];
  tables: TableVerification[];
  columns: ColumnVerification[];
  indexes: IndexVerification[];
}

interface RolloutVerificationSummary {
  filters: {
    migrations: string[];
    explicitSchemas: string[];
    requiredTables: string[];
    requiredColumns: string[];
    requiredIndexes: string[];
  };
  checkedSchemas: string[];
  publicMigrations: PublicMigrationVerification[];
  schemaArtifacts: SchemaArtifactVerification[];
  passed: boolean;
  failures: string[];
}

interface PrismaMigrationRow {
  migrationName: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
}

function parseRequiredColumn(value: string): RequiredColumn {
  const separatorIndex = value.indexOf('.');

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(`Invalid --require-column value "${value}". Use <table>.<column>.`);
  }

  return {
    tableName: value.slice(0, separatorIndex),
    columnName: value.slice(separatorIndex + 1),
  };
}

function parseCliArgs(argv: string[]): CliOptions {
  const migrations: string[] = [];
  const schemas: string[] = [];
  const requiredTables: string[] = [];
  const requiredColumns: RequiredColumn[] = [];
  const requiredIndexes: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--migration') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --migration');
      }

      migrations.push(value);
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

    if (arg === '--require-table') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --require-table');
      }

      requiredTables.push(value);
      index += 1;
      continue;
    }

    if (arg === '--require-column') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --require-column');
      }

      requiredColumns.push(parseRequiredColumn(value));
      index += 1;
      continue;
    }

    if (arg === '--require-index') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --require-index');
      }

      requiredIndexes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (
    migrations.length === 0 &&
    requiredTables.length === 0 &&
    requiredColumns.length === 0 &&
    requiredIndexes.length === 0
  ) {
    throw new Error(
      'At least one verification target is required. Use --migration, --require-table, --require-column, or --require-index.',
    );
  }

  return {
    migrations: [...new Set(migrations)],
    schemas: [...new Set(schemas)],
    requiredTables: [...new Set(requiredTables)],
    requiredColumns: requiredColumns.filter(
      (value, currentIndex, items) =>
        items.findIndex(
          (candidate) =>
            candidate.tableName === value.tableName && candidate.columnName === value.columnName,
        ) === currentIndex,
    ),
    requiredIndexes: [...new Set(requiredIndexes)],
    json,
  };
}

async function getTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return options.schemas;
  }

  const activeTenants = await prisma.$queryRaw<Array<{ schemaName: string | null }>>`
    SELECT schema_name AS "schemaName"
    FROM public.tenant
    WHERE is_active = true
      AND schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `;

  return [
    'tenant_template',
    ...activeTenants
      .map((tenant) => tenant.schemaName)
      .filter((schemaName): schemaName is string => Boolean(schemaName)),
  ].filter((schemaName, index, values) => values.indexOf(schemaName) === index);
}

async function schemaExists(prisma: PrismaClient, schemaName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.schemata
        WHERE schema_name = $1
      ) AS exists
    `,
    schemaName,
  );

  return rows[0]?.exists ?? false;
}

async function tableExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
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

async function columnExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = $3
      ) AS exists
    `,
    schemaName,
    tableName,
    columnName,
  );

  return rows[0]?.exists ?? false;
}

async function indexExists(
  prisma: PrismaClient,
  schemaName: string,
  indexName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = $1
          AND indexname = $2
      ) AS exists
    `,
    schemaName,
    indexName,
  );

  return rows[0]?.exists ?? false;
}

async function verifyPublicMigrations(
  prisma: PrismaClient,
  migrationNames: string[],
): Promise<PublicMigrationVerification[]> {
  if (migrationNames.length === 0) {
    return [];
  }

  const rows = await prisma.$queryRaw<PrismaMigrationRow[]>`
    SELECT
      migration_name AS "migrationName",
      finished_at AS "finishedAt",
      rolled_back_at AS "rolledBackAt"
    FROM public._prisma_migrations
  `;

  return migrationNames.map((migrationName) => {
    const matchingRows = rows.filter((candidate) => candidate.migrationName === migrationName);

    if (matchingRows.length === 0) {
      return {
        migrationName,
        present: false,
        finished: false,
        rolledBack: false,
        attemptCount: 0,
        successfulAttemptCount: 0,
        rolledBackAttemptCount: 0,
        passed: false,
        reason: 'Missing from public._prisma_migrations.',
      };
    }

    const successfulAttemptCount = matchingRows.filter(
      (candidate) => candidate.finishedAt !== null && candidate.rolledBackAt === null,
    ).length;
    const rolledBackAttemptCount = matchingRows.filter(
      (candidate) => candidate.rolledBackAt !== null,
    ).length;

    if (successfulAttemptCount > 0) {
      return {
        migrationName,
        present: true,
        finished: true,
        rolledBack: rolledBackAttemptCount > 0,
        attemptCount: matchingRows.length,
        successfulAttemptCount,
        rolledBackAttemptCount,
        passed: true,
        reason:
          rolledBackAttemptCount > 0
            ? 'Migration finished successfully. Historical rolled-back attempts exist.'
            : 'Migration record finished successfully.',
      };
    }

    if (rolledBackAttemptCount > 0) {
      return {
        migrationName,
        present: true,
        finished: false,
        rolledBack: true,
        attemptCount: matchingRows.length,
        successfulAttemptCount,
        rolledBackAttemptCount,
        passed: false,
        reason: 'Migration attempts exist but all recorded attempts are rolled back.',
      };
    }

    return {
      migrationName,
      present: true,
      finished: false,
      rolledBack: false,
      attemptCount: matchingRows.length,
      successfulAttemptCount,
      rolledBackAttemptCount,
      passed: false,
      reason: 'Migration record exists but has no successful finished attempt.',
    };
  });
}

async function verifySchemaArtifacts(
  prisma: PrismaClient,
  schemaName: string,
  options: CliOptions,
): Promise<SchemaArtifactVerification> {
  const exists = await schemaExists(prisma, schemaName);

  if (!exists) {
    return {
      schemaName,
      schemaExists: false,
      passed: false,
      failures: [`Schema ${schemaName} does not exist.`],
      tables: options.requiredTables.map((tableName) => ({ tableName, present: false })),
      columns: options.requiredColumns.map((column) => ({ ...column, present: false })),
      indexes: options.requiredIndexes.map((indexName) => ({ indexName, present: false })),
    };
  }

  const tables = await Promise.all(
    options.requiredTables.map(async (tableName) => ({
      tableName,
      present: await tableExists(prisma, schemaName, tableName),
    })),
  );
  const columns = await Promise.all(
    options.requiredColumns.map(async (column) => ({
      ...column,
      present: await columnExists(prisma, schemaName, column.tableName, column.columnName),
    })),
  );
  const indexes = await Promise.all(
    options.requiredIndexes.map(async (indexName) => ({
      indexName,
      present: await indexExists(prisma, schemaName, indexName),
    })),
  );

  const failures = [
    ...tables
      .filter((item) => !item.present)
      .map((item) => `Missing table ${schemaName}.${item.tableName}.`),
    ...columns
      .filter((item) => !item.present)
      .map((item) => `Missing column ${schemaName}.${item.tableName}.${item.columnName}.`),
    ...indexes
      .filter((item) => !item.present)
      .map((item) => `Missing index ${schemaName}.${item.indexName}.`),
  ];

  return {
    schemaName,
    schemaExists: true,
    passed: failures.length === 0,
    failures,
    tables,
    columns,
    indexes,
  };
}

async function verifySchemaRollout(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RolloutVerificationSummary> {
  const checkedSchemas = await getTargetSchemas(prisma, options);
  const publicMigrations = await verifyPublicMigrations(prisma, options.migrations);
  const schemaArtifacts = await Promise.all(
    checkedSchemas.map((schemaName) => verifySchemaArtifacts(prisma, schemaName, options)),
  );

  const failures = [
    ...publicMigrations.filter((item) => !item.passed).map((item) => item.reason),
    ...schemaArtifacts.flatMap((item) => item.failures),
  ];

  return {
    filters: {
      migrations: options.migrations,
      explicitSchemas: options.schemas,
      requiredTables: options.requiredTables,
      requiredColumns: options.requiredColumns.map(
        (item) => `${item.tableName}.${item.columnName}`,
      ),
      requiredIndexes: options.requiredIndexes,
    },
    checkedSchemas,
    publicMigrations,
    schemaArtifacts,
    passed: failures.length === 0,
    failures,
  };
}

function printSummary(summary: RolloutVerificationSummary): void {
  console.log(summary.passed ? '✅ Schema rollout verification passed' : '❌ Schema rollout verification failed');

  if (summary.publicMigrations.length > 0) {
    console.log('\nPublic migrations:');

    for (const migration of summary.publicMigrations) {
      console.log(
        `- ${migration.migrationName}: ${migration.passed ? 'ok' : 'failed'} (${migration.reason})`,
      );
    }
  }

  if (summary.schemaArtifacts.length > 0) {
    console.log('\nSchema artifacts:');

    for (const schema of summary.schemaArtifacts) {
      console.log(`- ${schema.schemaName}: ${schema.passed ? 'ok' : 'failed'}`);

      for (const table of schema.tables) {
        console.log(`  - table ${table.tableName}: ${table.present ? 'present' : 'missing'}`);
      }

      for (const column of schema.columns) {
        console.log(
          `  - column ${column.tableName}.${column.columnName}: ${column.present ? 'present' : 'missing'}`,
        );
      }

      for (const index of schema.indexes) {
        console.log(`  - index ${index.indexName}: ${index.present ? 'present' : 'missing'}`);
      }

      for (const failure of schema.failures) {
        console.log(`  - failure: ${failure}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await verifySchemaRollout(prisma, options);

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      printSummary(summary);
    }

    if (!summary.passed) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('Schema rollout verification failed:', error);
    process.exit(1);
  });
}
