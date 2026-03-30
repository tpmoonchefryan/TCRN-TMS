// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

function normalizeStatement(statement: string): string {
  return statement.replace(/\s+/g, ' ').trim().toUpperCase();
}

function isCommentOnlyStatement(statement: string): boolean {
  return statement
    .split('\n')
    .every((line) => line.trim().startsWith('--') || line.trim() === '');
}

export interface TenantMigrationExecutionSummary {
  success: number;
  skipped: number;
  errors: number;
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

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === '$' && sql[i + 1] === '$') {
      current += '$$';
      i += 2;
      inDollarBlock = !inDollarBlock;
      continue;
    }

    if (sql[i] === ';' && !inDollarBlock) {
      current += ';';
      const trimmed = current.trim();
      if (trimmed.length > 0 && !trimmed.match(/^--.*$/)) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += sql[i];
    i++;
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

export function isIgnorableTenantMigrationError(
  statement: string,
  message: string
): boolean {
  const normalizedStatement = normalizeStatement(statement);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('duplicate key')) {
    return false;
  }

  if (normalizedMessage.includes('already exists')) {
    return (
      normalizedStatement.startsWith('CREATE ') ||
      /^ALTER TABLE\b.*\bADD\b/.test(normalizedStatement) ||
      /^ALTER TYPE\b.*\bADD VALUE\b/.test(normalizedStatement)
    );
  }

  if (normalizedMessage.includes('does not exist')) {
    return (
      normalizedStatement.startsWith('DROP ') ||
      /^ALTER TABLE\b.*\b(DROP|RENAME)\b/.test(normalizedStatement) ||
      /^ALTER INDEX\b.*\bRENAME\b/.test(normalizedStatement) ||
      /^ALTER TYPE\b.*\b(DROP|RENAME)\b/.test(normalizedStatement)
    );
  }

  return false;
}

export async function executeTenantMigrationStatements(
  options: ExecuteTenantMigrationStatementsOptions,
): Promise<TenantMigrationExecutionSummary> {
  const {
    statements,
    targetSchema,
    migrationName,
    executeStatement,
    onNonIgnorableError,
  } = options;

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const statement of statements) {
    if (isCommentOnlyStatement(statement)) {
      continue;
    }

    try {
      await executeStatement(statement);
      success += 1;
    } catch (error) {
      const message = getErrorMessage(error);

      if (isIgnorableTenantMigrationError(statement, message)) {
        skipped += 1;
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

  return { success, skipped, errors };
}
