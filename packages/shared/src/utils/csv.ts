// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

const CSV_FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;
const CSV_QUOTE_PATTERN = /[",\n\r]/;

export function neutralizeCsvFormula(value: string): string {
  return CSV_FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: unknown): string {
  const normalized = neutralizeCsvFormula(String(value ?? ''));
  if (CSV_QUOTE_PATTERN.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
