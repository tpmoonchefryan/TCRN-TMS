// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

function stripLeadingSqlComments(statement: string): string {
  let remaining = statement.trimStart();

  while (remaining.length > 0) {
    if (remaining.startsWith('--')) {
      const nextLineBreak = remaining.indexOf('\n');
      remaining = nextLineBreak === -1 ? '' : remaining.slice(nextLineBreak + 1).trimStart();
      continue;
    }

    if (remaining.startsWith('/*')) {
      const blockCommentEnd = remaining.indexOf('*/');

      if (blockCommentEnd === -1) {
        return '';
      }

      remaining = remaining.slice(blockCommentEnd + 2).trimStart();
      continue;
    }

    break;
  }

  return remaining;
}

function normalizeStatement(statement: string): string {
  return stripLeadingSqlComments(statement).replace(/\s+/g, ' ').trim().toUpperCase();
}

function readDollarQuoteDelimiter(sql: string, start: number): string | null {
  if (sql[start] !== '$') {
    return null;
  }

  if (sql[start + 1] === '$') {
    return '$$';
  }

  const firstTagChar = sql[start + 1];
  if (!firstTagChar || !/[A-Za-z_]/.test(firstTagChar)) {
    return null;
  }

  let end = start + 2;
  while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) {
    end += 1;
  }

  if (sql[end] !== '$') {
    return null;
  }

  return sql.slice(start, end + 1);
}

function isCommentOnlyStatement(statement: string): boolean {
  return stripLeadingSqlComments(statement).trim().length === 0;
}

export interface TenantMigrationExecutionSummary {
  success: number;
  skipped: number;
  errors: number;
  skippedByReason: TenantMigrationSkipReasonCounts;
}

export interface TenantMigrationErrorDetail {
  migrationName: string;
  targetSchema: string;
  statement: string;
  statementPreview: string;
  message: string;
}

export interface ExecuteTenantMigrationStatementsOptions {
  statements: readonly string[];
  targetSchema: string;
  migrationName: string;
  executeStatement: (statement: string) => Promise<void>;
  onNonIgnorableError?: (detail: TenantMigrationErrorDetail) => void;
}

export const TENANT_MIGRATION_SKIP_REASONS = [
  'create_exists',
  'create_index_target_missing',
  'alter_table_add_exists',
  'alter_type_add_value_exists',
  'drop_table_missing',
  'drop_index_missing',
  'drop_missing',
  'alter_table_drop_constraint_missing',
  'alter_table_drop_column_missing',
  'alter_table_drop_or_rename_missing',
  'alter_index_rename_exists',
  'alter_index_rename_missing',
  'alter_type_drop_or_rename_missing',
] as const;

export type TenantMigrationSkipReason = (typeof TENANT_MIGRATION_SKIP_REASONS)[number];

export type TenantMigrationSkipReasonCounts = Partial<Record<TenantMigrationSkipReason, number>>;

export const TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS = [
  'drop_table_missing',
  'drop_missing',
  'alter_table_drop_or_rename_missing',
  'alter_index_rename_missing',
  'alter_type_drop_or_rename_missing',
] as const;

export type TenantMigrationDriftWatchSkipReason =
  (typeof TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS)[number];

export interface ApplyMigrationsCliOptions {
  failOnDriftWatchSkips: boolean;
  printSchemaSkipDetails: boolean;
}

export interface ApplyMigrationsExitEvaluation {
  shouldFail: boolean;
  driftWatchSkips: number;
  reasons: string[];
}

const TENANT_MIGRATION_SKIP_REASON_LABELS: Record<TenantMigrationSkipReason, string> = {
  create_exists: 'create/already_exists',
  create_index_target_missing: 'create_index/does_not_exist',
  alter_table_add_exists: 'alter_table_add/already_exists',
  alter_type_add_value_exists: 'alter_type_add_value/already_exists',
  drop_table_missing: 'drop_table/does_not_exist',
  drop_index_missing: 'drop_index/does_not_exist',
  drop_missing: 'drop/does_not_exist',
  alter_table_drop_constraint_missing: 'alter_table_drop_constraint/does_not_exist',
  alter_table_drop_column_missing: 'alter_table_drop_column/does_not_exist',
  alter_table_drop_or_rename_missing: 'alter_table_drop_or_rename/does_not_exist',
  alter_index_rename_exists: 'alter_index_rename/already_exists',
  alter_index_rename_missing: 'alter_index_rename/does_not_exist',
  alter_type_drop_or_rename_missing: 'alter_type_drop_or_rename/does_not_exist',
};

function incrementSkipReasonCount(
  counts: TenantMigrationSkipReasonCounts,
  reason: TenantMigrationSkipReason,
  amount = 1
): void {
  counts[reason] = (counts[reason] ?? 0) + amount;
}

export function mergeTenantMigrationSkipReasonCounts(
  target: TenantMigrationSkipReasonCounts,
  source: TenantMigrationSkipReasonCounts
): TenantMigrationSkipReasonCounts {
  for (const reason of TENANT_MIGRATION_SKIP_REASONS) {
    const amount = source[reason];

    if (!amount) {
      continue;
    }

    incrementSkipReasonCount(target, reason, amount);
  }

  return target;
}

export function formatTenantMigrationSkipReasonCounts(
  counts: TenantMigrationSkipReasonCounts
): string {
  return TENANT_MIGRATION_SKIP_REASONS.flatMap((reason) => {
    const amount = counts[reason];

    if (!amount) {
      return [];
    }

    return [`${TENANT_MIGRATION_SKIP_REASON_LABELS[reason]}=${amount}`];
  }).join(', ');
}

export function countTenantMigrationSkips(
  counts: TenantMigrationSkipReasonCounts,
  reasons: readonly TenantMigrationSkipReason[] = TENANT_MIGRATION_SKIP_REASONS
): number {
  return reasons.reduce((total, reason) => total + (counts[reason] ?? 0), 0);
}

export function formatTenantMigrationDriftWatchSkipReasonCounts(
  counts: TenantMigrationSkipReasonCounts
): string {
  return TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS.flatMap((reason) => {
    const amount = counts[reason];

    if (!amount) {
      return [];
    }

    return [`${TENANT_MIGRATION_SKIP_REASON_LABELS[reason]}=${amount}`];
  }).join(', ');
}

export function parseApplyMigrationsCliArgs(argv: string[]): ApplyMigrationsCliOptions {
  let failOnDriftWatchSkips = false;
  let printSchemaSkipDetails = false;

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--fail-on-drift-watch-skips') {
      failOnDriftWatchSkips = true;
      continue;
    }

    if (arg === '--print-schema-skip-details') {
      printSchemaSkipDetails = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { failOnDriftWatchSkips, printSchemaSkipDetails };
}

export function evaluateApplyMigrationsExitStatus(options: {
  totalErrors: number;
  totalSkippedByReason: TenantMigrationSkipReasonCounts;
  failOnDriftWatchSkips: boolean;
}): ApplyMigrationsExitEvaluation {
  const driftWatchSkips = countTenantMigrationSkips(
    options.totalSkippedByReason,
    TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS
  );
  const reasons: string[] = [];

  if (options.totalErrors > 0) {
    reasons.push(`non_ignorable_errors=${options.totalErrors}`);
  }

  if (options.failOnDriftWatchSkips && driftWatchSkips > 0) {
    reasons.push(`drift_watch_skips=${driftWatchSkips}`);
  }

  return {
    shouldFail: reasons.length > 0,
    driftWatchSkips,
    reasons,
  };
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let activeDollarQuoteDelimiter: string | null = null;
  let inSingleQuotedString = false;
  let inDoubleQuotedIdentifier = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;

  while (i < sql.length) {
    const currentChar = sql[i];

    if (inLineComment) {
      current += currentChar;
      i += 1;

      if (currentChar === '\n') {
        inLineComment = false;
      }

      continue;
    }

    if (inBlockComment) {
      current += currentChar;

      if (currentChar === '*' && sql[i + 1] === '/') {
        current += '/';
        i += 2;
        inBlockComment = false;
        continue;
      }

      i += 1;
      continue;
    }

    if (activeDollarQuoteDelimiter) {
      if (sql.startsWith(activeDollarQuoteDelimiter, i)) {
        current += activeDollarQuoteDelimiter;
        i += activeDollarQuoteDelimiter.length;
        activeDollarQuoteDelimiter = null;
        continue;
      }

      current += currentChar;
      i += 1;
      continue;
    }

    if (inSingleQuotedString) {
      current += currentChar;

      if (currentChar === "'") {
        if (sql[i + 1] === "'") {
          current += "'";
          i += 2;
          continue;
        }

        inSingleQuotedString = false;
      }

      i += 1;
      continue;
    }

    if (inDoubleQuotedIdentifier) {
      current += currentChar;

      if (currentChar === '"') {
        if (sql[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }

        inDoubleQuotedIdentifier = false;
      }

      i += 1;
      continue;
    }

    const dollarQuoteDelimiter = readDollarQuoteDelimiter(sql, i);
    if (dollarQuoteDelimiter) {
      current += dollarQuoteDelimiter;
      i += dollarQuoteDelimiter.length;
      activeDollarQuoteDelimiter = dollarQuoteDelimiter;
      continue;
    }

    if (currentChar === '-' && sql[i + 1] === '-') {
      current += '--';
      i += 2;
      inLineComment = true;
      continue;
    }

    if (currentChar === '/' && sql[i + 1] === '*') {
      current += '/*';
      i += 2;
      inBlockComment = true;
      continue;
    }

    if (currentChar === "'") {
      current += currentChar;
      inSingleQuotedString = true;
      i += 1;
      continue;
    }

    if (currentChar === '"') {
      current += currentChar;
      inDoubleQuotedIdentifier = true;
      i += 1;
      continue;
    }

    if (currentChar === ';') {
      current += ';';
      const trimmed = current.trim();
      if (trimmed.length > 0 && !trimmed.match(/^--.*$/)) {
        statements.push(trimmed);
      }
      current = '';
      i += 1;
      continue;
    }

    current += currentChar;
    i += 1;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0 && !trimmed.match(/^--.*$/)) {
    statements.push(trimmed);
  }

  return statements;
}

export function formatStatementPreview(statement: string, maxLength = 120): string {
  const normalized = statement.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(error);
}

export function classifyIgnorableTenantMigrationError(
  statement: string,
  message: string
): TenantMigrationSkipReason | null {
  const normalizedStatement = normalizeStatement(statement);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('duplicate key')) {
    return null;
  }

  if (normalizedMessage.includes('already exists')) {
    if (normalizedStatement.startsWith('CREATE ')) {
      return 'create_exists';
    }

    if (
      /^ALTER INDEX\b.*\bRENAME\b/.test(normalizedStatement) &&
      normalizedMessage.includes('relation ')
    ) {
      return 'alter_index_rename_exists';
    }

    if (/^ALTER TABLE\b.*\bADD\b/.test(normalizedStatement)) {
      return 'alter_table_add_exists';
    }

    if (/^ALTER TYPE\b.*\bADD VALUE\b/.test(normalizedStatement)) {
      return 'alter_type_add_value_exists';
    }

    return null;
  }

  if (normalizedMessage.includes('does not exist')) {
    if (
      /^CREATE(?: UNIQUE)? INDEX\b/.test(normalizedStatement) &&
      normalizedMessage.includes('column ')
    ) {
      return 'create_index_target_missing';
    }

    if (/^DROP TABLE\b/.test(normalizedStatement)) {
      return 'drop_table_missing';
    }

    if (/^DROP INDEX\b/.test(normalizedStatement)) {
      return 'drop_index_missing';
    }

    if (normalizedStatement.startsWith('DROP ')) {
      return 'drop_missing';
    }

    if (/^ALTER TABLE\b.*\bDROP CONSTRAINT\b/.test(normalizedStatement)) {
      return 'alter_table_drop_constraint_missing';
    }

    if (/^ALTER TABLE\b.*\bDROP COLUMN\b/.test(normalizedStatement)) {
      return 'alter_table_drop_column_missing';
    }

    if (/^ALTER TABLE\b.*\b(DROP|RENAME)\b/.test(normalizedStatement)) {
      return 'alter_table_drop_or_rename_missing';
    }

    if (/^ALTER INDEX\b.*\bRENAME\b/.test(normalizedStatement)) {
      return 'alter_index_rename_missing';
    }

    if (/^ALTER TYPE\b.*\b(DROP|RENAME)\b/.test(normalizedStatement)) {
      return 'alter_type_drop_or_rename_missing';
    }

    return null;
  }

  return null;
}

export function isIgnorableTenantMigrationError(statement: string, message: string): boolean {
  return classifyIgnorableTenantMigrationError(statement, message) !== null;
}

export async function executeTenantMigrationStatements(
  options: ExecuteTenantMigrationStatementsOptions
): Promise<TenantMigrationExecutionSummary> {
  const { statements, targetSchema, migrationName, executeStatement, onNonIgnorableError } =
    options;

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const skippedByReason: TenantMigrationSkipReasonCounts = {};

  for (const statement of statements) {
    if (isCommentOnlyStatement(statement)) {
      continue;
    }

    try {
      await executeStatement(statement);
      success += 1;
    } catch (error) {
      const message = getErrorMessage(error);
      const skipReason = classifyIgnorableTenantMigrationError(statement, message);

      if (skipReason) {
        skipped += 1;
        incrementSkipReasonCount(skippedByReason, skipReason);
        continue;
      }

      errors += 1;
      onNonIgnorableError?.({
        migrationName,
        targetSchema,
        statement,
        statementPreview: formatStatementPreview(statement),
        message,
      });
    }
  }

  return { success, skipped, errors, skippedByReason };
}
