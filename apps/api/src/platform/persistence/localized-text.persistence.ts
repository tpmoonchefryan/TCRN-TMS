import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@tcrn/database';
import {
  isLocalizedText,
  normalizeLocalizedText,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';

type JsonRecord = Record<string, unknown>;

export function toJsonInput(input: JsonRecord): Prisma.InputJsonValue {
  return input as Prisma.InputJsonValue;
}

export function toNullableJsonInput(
  input: JsonRecord | null
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!input) {
    return Prisma.DbNull;
  }

  return input as Prisma.InputJsonValue;
}

export function toLocalizedTextJsonInput(input: LocalizedText): Prisma.InputJsonValue {
  return input as unknown as Prisma.InputJsonValue;
}

export function stringifyLocalizedText(input: LocalizedText): string {
  return JSON.stringify(input);
}

export function localizedTextSelect(columnName: string, alias = columnName): string {
  return `${columnName} as "${alias}"`;
}

export function localizedTextSearchExpression(columnName: string, parameter: string): string {
  return `EXISTS (SELECT 1 FROM jsonb_each_text(${columnName}) AS localized_text(locale, value) WHERE localized_text.value ILIKE ${parameter})`;
}

export function localizedTextOrderExpression(columnName: string, locale = 'en'): string {
  return `NULLIF(${columnName}->>'${locale}', '')`;
}

export function readLocalizedText(input: Prisma.JsonValue, fieldName: string): LocalizedText {
  if (!isLocalizedText(input)) {
    throw new BadRequestException(`${fieldName} must be stored as LocalizedText`);
  }

  return input;
}

export function normalizeRequiredLocalizedText(
  input: PartialLocalizedText | undefined | null,
  fieldName: string,
  fallback = ''
): LocalizedText {
  const normalized = normalizeLocalizedText(input, fallback);

  if (!normalized.en.trim()) {
    throw new BadRequestException(`${fieldName} requires an English value`);
  }

  return normalized;
}

export function normalizeOptionalLocalizedText(
  input: PartialLocalizedText | undefined | null,
  fallback = ''
): LocalizedText {
  return normalizeLocalizedText(input, fallback);
}

export function mergeLocalizedTextPatch(
  current: LocalizedText,
  patch: PartialLocalizedText | undefined | null
): LocalizedText {
  return normalizeLocalizedText({ ...current, ...(patch ?? {}) }, current.en);
}
