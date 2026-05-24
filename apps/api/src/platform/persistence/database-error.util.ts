// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

const POSTGRES_UNDEFINED_TABLE = '42P01';
const PRISMA_TABLE_NOT_FOUND = 'P2021';
const PRISMA_RAW_QUERY_FAILED = 'P2010';

function collectErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const record = error as {
    code?: unknown;
    message?: unknown;
    meta?: Record<string, unknown>;
  };

  return [
    record.code,
    record.message,
    record.meta?.code,
    record.meta?.message,
    record.meta?.table,
    record.meta?.modelName,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n');
}

export function isMissingDatabaseRelationError(
  error: unknown,
  relationNames: readonly string[]
): boolean {
  const text = collectErrorText(error).toLowerCase();

  if (!relationNames.some((relationName) => text.includes(relationName.toLowerCase()))) {
    return false;
  }

  return (
    text.includes(POSTGRES_UNDEFINED_TABLE.toLowerCase()) ||
    text.includes(PRISMA_TABLE_NOT_FOUND.toLowerCase()) ||
    text.includes(PRISMA_RAW_QUERY_FAILED.toLowerCase()) ||
    text.includes('does not exist') ||
    text.includes('not exist') ||
    text.includes('undefined table')
  );
}
