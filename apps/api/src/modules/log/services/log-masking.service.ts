// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import {
  DataMaskingService,
  getSensitiveFieldsForEntity,
  PERSONAL_INFO_FIELDS,
} from '@tcrn/shared';

/**
 * Log Masking Service
 * Applies data masking to log entries to protect PII
 */
@Injectable()
export class LogMaskingService {
  private readonly maskingService = new DataMaskingService();

  /**
   * Mask Change Log diff based on object type
   */
  maskChangeLogDiff(
    objectType: string,
    diff: Record<string, { old: unknown; new: unknown }>,
  ): Record<string, { old: unknown; new: unknown }> {
    // Get sensitive fields for this entity type
    const sensitiveFields = getSensitiveFieldsForEntity(objectType);

    const maskedDiff: Record<string, { old: unknown; new: unknown }> = {};

    for (const [field, change] of Object.entries(diff)) {
      if (sensitiveFields.includes(field)) {
        maskedDiff[field] = {
          old: this.maskingService.maskValue(
            change.old,
            this.getFieldType(field),
          ),
          new: this.maskingService.maskValue(
            change.new,
            this.getFieldType(field),
          ),
        };
      } else {
        maskedDiff[field] = change;
      }
    }

    return maskedDiff;
  }

  /**
   * Mask Technical Event Log payload
   */
  maskTechLogPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return this.deepMaskObject(payload);
  }

  /**
   * Mask Integration Log request/response body
   */
  maskIntegrationLogBody(
    body: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!body) return null;
    return this.deepMaskObject(body);
  }

  /**
   * Recursively mask object
   */
  private deepMaskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldConfig = PERSONAL_INFO_FIELDS.find((f) => f.field === key);

      if (fieldConfig) {
        result[key] = this.maskingService.maskValue(value, fieldConfig.type);
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.deepMaskObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get field type for masking
   */
  private getFieldType(field: string): string {
    const config = PERSONAL_INFO_FIELDS.find((f) => f.field === field);
    return config?.type || 'text';
  }
}
