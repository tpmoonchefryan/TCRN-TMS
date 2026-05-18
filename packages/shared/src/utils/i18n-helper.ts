// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { normalizeSupportedUiLocale } from '../constants/locale';
import { LocalizableEntity } from '../types/db-schema';

/**
 * Helper to get the localized value of a field from an entity.
 * Fallbacks to English if the requested locale value is empty.
 * 
 * @param entity The entity object containing LocalizedText fields.
 * @param fieldName The localized field, e.g., 'name' or 'description'
 * @param locale The requested locale tag; normalized to SupportedUiLocale
 * @returns The localized string or the English fallback
 */
export function getLocalizedValue<T extends LocalizableEntity>(
  entity: T,
  fieldName: 'name' | 'description',
  locale: string
): string {
  const safeLocale = normalizeSupportedUiLocale(locale) ?? 'en';
  const valueRecord = entity[fieldName];

  if (!valueRecord) {
    return '';
  }

  const value = valueRecord[safeLocale];

  if (value && typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  const fallback = valueRecord.en;
  return typeof fallback === 'string' ? fallback : '';
}

/**
 * Short-hand to get localized name
 */
export function getLocalizedName<T extends LocalizableEntity>(entity: T, locale: string): string {
  return getLocalizedValue(entity, 'name', locale);
}

/**
 * Short-hand to get localized description
 */
export function getLocalizedDescription<T extends LocalizableEntity>(entity: T, locale: string): string {
  return getLocalizedValue(entity, 'description', locale);
}
