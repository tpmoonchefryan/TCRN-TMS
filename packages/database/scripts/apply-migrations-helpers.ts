// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

function normalizeStatement(statement: string): string {
  return statement.replace(/\s+/g, ' ').trim().toUpperCase();
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
