// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RequiredColumn {
  tableName: string;
  columnName: string;
}

export interface InferredRolloutArtifacts {
  sourceMigrations: string[];
  requiredTables: string[];
  requiredColumns: RequiredColumn[];
  requiredIndexes: string[];
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(CURRENT_DIR, '../prisma/migrations');
const TENANT_SCHEMA_PATTERN = String.raw`(?:"?tenant_template"?|%I)`;
const TENANT_OBJECT_PATTERN = String.raw`${TENANT_SCHEMA_PATTERN}\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*)"?`;

const CREATE_TABLE_REGEX = new RegExp(
  String.raw`CREATE TABLE IF NOT EXISTS\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const CREATE_INDEX_REGEX = new RegExp(
  String.raw`CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+ON\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const ALTER_INDEX_RENAME_REGEX = new RegExp(
  String.raw`ALTER INDEX\s+${TENANT_OBJECT_PATTERN}\s+RENAME TO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?`,
  'gi'
);
const ALTER_TABLE_REGEX = new RegExp(
  String.raw`ALTER TABLE\s+${TENANT_OBJECT_PATTERN}([\s\S]*?);`,
  'gi'
);
const ADD_COLUMN_REGEX = /ADD COLUMN IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;

function compareRequiredColumns(a: RequiredColumn, b: RequiredColumn): number {
  const tableComparison = a.tableName.localeCompare(b.tableName);

  if (tableComparison !== 0) {
    return tableComparison;
  }

  return a.columnName.localeCompare(b.columnName);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedColumns(values: Iterable<RequiredColumn>): RequiredColumn[] {
  return [...values]
    .filter(
      (value, currentIndex, items) =>
        items.findIndex(
          (candidate) =>
            candidate.tableName === value.tableName && candidate.columnName === value.columnName
        ) === currentIndex
    )
    .sort(compareRequiredColumns);
}

export function inferRolloutArtifactsFromSql(
  sql: string
): Omit<InferredRolloutArtifacts, 'sourceMigrations'> {
  const requiredTables: string[] = [];
  const requiredColumns: RequiredColumn[] = [];
  const requiredIndexes: string[] = [];

  for (const match of sql.matchAll(CREATE_TABLE_REGEX)) {
    requiredTables.push(match[1]);
  }

  for (const match of sql.matchAll(CREATE_INDEX_REGEX)) {
    requiredIndexes.push(match[1]);
  }

  for (const match of sql.matchAll(ALTER_INDEX_RENAME_REGEX)) {
    requiredIndexes.push(match[2]);
  }

  for (const match of sql.matchAll(ALTER_TABLE_REGEX)) {
    const tableName = match[1];
    const alterBody = match[2];

    for (const columnMatch of alterBody.matchAll(ADD_COLUMN_REGEX)) {
      requiredColumns.push({
        tableName,
        columnName: columnMatch[1],
      });
    }
  }

  return {
    requiredTables: uniqueSorted(requiredTables),
    requiredColumns: uniqueSortedColumns(requiredColumns),
    requiredIndexes: uniqueSorted(requiredIndexes),
  };
}

export function inferRolloutArtifactsFromMigrations(
  migrationNames: string[],
  migrationsDir = DEFAULT_MIGRATIONS_DIR
): InferredRolloutArtifacts {
  const normalizedMigrationNames = uniqueSorted(migrationNames);
  const tables: string[] = [];
  const columns: RequiredColumn[] = [];
  const indexes: string[] = [];

  for (const migrationName of normalizedMigrationNames) {
    const migrationPath = path.join(migrationsDir, migrationName, 'migration.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(
        `Unable to infer rollout artifacts. Missing migration file: ${migrationPath}`
      );
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const inferred = inferRolloutArtifactsFromSql(sql);

    tables.push(...inferred.requiredTables);
    columns.push(...inferred.requiredColumns);
    indexes.push(...inferred.requiredIndexes);
  }

  return {
    sourceMigrations: normalizedMigrationNames,
    requiredTables: uniqueSorted(tables),
    requiredColumns: uniqueSortedColumns(columns),
    requiredIndexes: uniqueSorted(indexes),
  };
}
