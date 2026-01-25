// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  PERSONAL_INFO_FIELDS,
  type PersonalInfoFieldConfig,
} from '../constants/personal-info-fields';

/**
 * Data masking utility class
 * Implements PRD §4.2 and §11.2 masking rules
 */
export class DataMaskingService {
  /**
   * Mask diff object for change log
   */
  maskDiff(
    diff: Record<string, { old: unknown; new: unknown }>
  ): Record<string, { old: unknown; new: unknown }> {
    const maskedDiff: Record<string, { old: unknown; new: unknown }> = {};

    for (const [field, change] of Object.entries(diff)) {
      const config = this.getFieldConfig(field);

      if (config) {
        maskedDiff[field] = {
          old: this.maskValue(change.old, config.type),
          new: this.maskValue(change.new, config.type),
        };
      } else {
        // Non-sensitive field, keep original value
        maskedDiff[field] = change;
      }
    }

    return maskedDiff;
  }

  /**
   * Mask single value based on type
   */
  maskValue(value: unknown, type: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'text':
        return '***';

      case 'phone':
        return this.maskPhone(String(value));

      case 'phone_array':
        return this.maskPhoneArray(value as string[] | Record<string, unknown>[]);

      case 'email':
        return this.maskEmail(String(value));

      case 'email_array':
        return this.maskEmailArray(value as string[] | Record<string, unknown>[]);

      case 'address_array':
        return this.maskAddressArray(value as unknown[]);

      default:
        return '***';
    }
  }

  /**
   * Mask phone number
   * Rule: Keep country code and first 2 + last 2 digits
   * Example: +86 13812345678 → +86 13********78
   */
  maskPhone(phone: string): string {
    if (!phone) return phone;

    // Match country code (optional) and number
    const match = phone.match(/^(\+\d{1,3}\s?)?(.+)$/);
    if (!match) return '***';

    const countryCode = match[1] || '';
    const number = match[2].replace(/\s/g, '');

    if (number.length <= 4) {
      return countryCode + '***';
    }

    const prefix = number.slice(0, 2);
    const suffix = number.slice(-2);
    const masked = '*'.repeat(number.length - 4);

    return `${countryCode}${prefix}${masked}${suffix}`;
  }

  /**
   * Mask phone array
   */
  maskPhoneArray(phones: string[] | Record<string, unknown>[]): string[] {
    if (!Array.isArray(phones)) return ['***'];
    return phones.map((p) => {
      if (typeof p === 'string') return this.maskPhone(p);
      if (p?.number) return this.maskPhone(String(p.number));
      return '***';
    });
  }

  /**
   * Mask email address
   * Rule: Keep first and last char of local part, full domain
   * Example: example.user@gmail.com → e******r@gmail.com
   */
  maskEmail(email: string): string {
    if (!email) return email;

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***';

    if (localPart.length <= 2) {
      return `${localPart[0]}*@${domain}`;
    }

    const first = localPart[0];
    const last = localPart[localPart.length - 1];
    const masked = '*'.repeat(Math.min(localPart.length - 2, 6));

    return `${first}${masked}${last}@${domain}`;
  }

  /**
   * Mask email array
   */
  maskEmailArray(emails: string[] | Record<string, unknown>[]): string[] {
    if (!Array.isArray(emails)) return ['***'];
    return emails.map((e) => {
      if (typeof e === 'string') return this.maskEmail(e);
      if (e?.email) return this.maskEmail(String(e.email));
      return '***';
    });
  }

  /**
   * Mask address
   * Rule: Keep only country/province/city level
   */
  maskAddress(address: unknown): unknown {
    if (!address) return address;

    if (typeof address === 'string') {
      // Simple string address, fully mask
      return '***';
    }

    const addr = address as Record<string, unknown>;

    // Structured address, keep country/province/city
    return {
      country: addr.country || null,
      province: addr.province || addr.state || null,
      city: addr.city || null,
      district: '***',
      street: '***',
      detail: '***',
      postal_code: '***',
    };
  }

  /**
   * Mask address array
   */
  maskAddressArray(addresses: unknown[]): unknown[] {
    if (!Array.isArray(addresses)) return [{ detail: '***' }];
    return addresses.map((a) => this.maskAddress(a));
  }

  /**
   * Deep mask object recursively
   */
  deepMaskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldConfig = PERSONAL_INFO_FIELDS.find((f) => f.field === key);

      if (fieldConfig) {
        result[key] = this.maskValue(value, fieldConfig.type);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMaskObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get field config by name
   */
  private getFieldConfig(field: string): PersonalInfoFieldConfig | undefined {
    return PERSONAL_INFO_FIELDS.find((f) => f.field === field);
  }
}

// Export singleton instance for convenience
export const dataMaskingService = new DataMaskingService();
