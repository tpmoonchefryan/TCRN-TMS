// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { UnauthorizedException } from '@nestjs/common';

import { ErrorCodes } from '@tcrn/shared';

const SQL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSafeSqlIdentifier(identifier: string, label = 'SQL identifier'): string {
  if (!SQL_IDENTIFIER_PATTERN.test(identifier)) {
    throw new UnauthorizedException({
      code: ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
      message: `${label} is invalid`,
    });
  }

  return identifier;
}

export function quoteSqlIdentifier(identifier: string, label?: string): string {
  return `"${assertSafeSqlIdentifier(identifier, label).replace(/"/g, '""')}"`;
}
