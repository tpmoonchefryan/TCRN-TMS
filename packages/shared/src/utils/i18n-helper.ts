// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LocalizableEntity } from '../types/db-schema';

type Locale = 'en' | 'zh' | 'ja';

/**
 * Helper to get the localized value of a field from an entity.
 * Fallbacks to English if the requested locale value is empty.
 * 
 * @param entity The entity object containing name_en, name_zh, etc.
 * @param fieldPrefix The prefix of the field, e.g., 'name' or 'description'
 * @param locale The desired locale code ('en', 'zh', 'ja')
 * @returns The localized string or the English fallback
 */
export function getLocalizedValue<T extends LocalizableEntity>(
  entity: T,
  fieldPrefix: 'name' | 'description',
  locale: string
): string {
  // Normalize locale to supported keys
  const safeLocale = (['zh', 'ja'].includes(locale) ? locale : 'en') as Locale;
  
  const key = `${fieldPrefix}_${safeLocale}` as keyof T;
  const fallbackKey = `${fieldPrefix}_en` as keyof T;

  const value = entity[key];
  
  if (value && typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  // Fallback to EN
  const fallback = entity[fallbackKey];
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
