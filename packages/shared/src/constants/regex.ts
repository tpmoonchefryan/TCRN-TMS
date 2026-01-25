// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Regular expression patterns used for validation
 */
export const Regex = {
  /**
   * Entity code pattern (PRD §10.1)
   * 3-32 characters, uppercase letters, numbers, and underscores
   */
  ENTITY_CODE: /^[A-Z0-9_]{3,32}$/,

  /**
   * UUID v4 pattern
   */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /**
   * Email pattern (RFC 5322 simplified)
   */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  /**
   * Phone number with optional country code
   */
  PHONE: /^\+?[1-9]\d{1,14}$/,

  /**
   * ISO 639-1 language code
   */
  LANGUAGE_CODE: /^[a-z]{2}$/,

  /**
   * ISO 3166-1 alpha-2 country code
   */
  COUNTRY_CODE: /^[A-Z]{2}$/,

  /**
   * URL path segment (for talent homepage custom path)
   */
  URL_PATH: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,

  /**
   * Password complexity (PRD §12.3)
   * At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
   */
  PASSWORD_COMPLEXITY: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{12,}$/,

  /**
   * Username pattern
   * 3-32 characters, alphanumeric and underscores
   */
  USERNAME: /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/,

  /**
   * Role code pattern (same as entity code)
   */
  ROLE_CODE: /^[A-Z0-9_]{3,32}$/,
} as const;

/**
 * Validation helper functions
 */
export const validate = {
  isEntityCode: (value: string): boolean => Regex.ENTITY_CODE.test(value),
  isUuid: (value: string): boolean => Regex.UUID.test(value),
  isEmail: (value: string): boolean => Regex.EMAIL.test(value),
  isPhone: (value: string): boolean => Regex.PHONE.test(value),
  isLanguageCode: (value: string): boolean => Regex.LANGUAGE_CODE.test(value),
  isCountryCode: (value: string): boolean => Regex.COUNTRY_CODE.test(value),
  isUrlPath: (value: string): boolean => Regex.URL_PATH.test(value),
  isValidPassword: (value: string): boolean => Regex.PASSWORD_COMPLEXITY.test(value),
  isUsername: (value: string): boolean => Regex.USERNAME.test(value),
  isRoleCode: (value: string): boolean => Regex.ROLE_CODE.test(value),
};
