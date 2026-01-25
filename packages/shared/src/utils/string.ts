// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Convert string to uppercase entity code format
 * (PRD §10.1: code 输入自动转大写)
 */
export function toEntityCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Generate a random string (for IDs, codes, etc.)
 */
export function generateRandomString(length: number, charset?: string): string {
  const chars = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Mask sensitive data (PRD §4.2 脱敏策略)
 */
export const mask = {
  /**
   * Mask email: e******r@gmail.com
   */
  email(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain || local.length < 2) return '***@***';
    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}@${domain}`;
  },

  /**
   * Mask phone: +86 13********78
   */
  phone(phone: string): string {
    // Remove spaces and extract digits
    const digits = phone.replace(/\s/g, '');
    const hasCountryCode = digits.startsWith('+');

    if (hasCountryCode) {
      // Find where country code ends (1-4 digits after +)
      const match = digits.match(/^(\+\d{1,4})(\d+)$/);
      if (match) {
        const [, countryCode, number] = match;
        if (number.length >= 4) {
          return `${countryCode} ${number.slice(0, 2)}${'*'.repeat(number.length - 4)}${number.slice(-2)}`;
        }
      }
    }

    // No country code or short number
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}`;
    }

    return '***';
  },

  /**
   * Mask general text: ***
   */
  text(_value: string): string {
    return '***';
  },
};
