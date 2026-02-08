// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach,describe, expect, it } from 'vitest';

import { LogMaskingService } from '../log-masking.service';

describe('LogMaskingService', () => {
  let service: LogMaskingService;

  beforeEach(() => {
    service = new LogMaskingService();
  });

  describe('maskChangeLogDiff', () => {
    it('should mask sensitive fields in diff', () => {
      const diff = {
        email: { old: 'old@example.com', new: 'new@example.com' },
        nickname: { old: 'OldNick', new: 'NewNick' },
      };

      const result = service.maskChangeLogDiff('customer', diff);

      // Nickname should not be masked
      expect(result.nickname.old).toBe('OldNick');
      expect(result.nickname.new).toBe('NewNick');
    });

    it('should preserve non-sensitive fields', () => {
      const diff = {
        status: { old: 'active', new: 'inactive' },
        tier: { old: 'standard', new: 'premium' },
      };

      const result = service.maskChangeLogDiff('tenant', diff);

      expect(result.status.old).toBe('active');
      expect(result.status.new).toBe('inactive');
    });

    it('should handle empty diff', () => {
      const result = service.maskChangeLogDiff('customer', {});

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('maskTechLogPayload', () => {
    it('should mask PII fields in payload', () => {
      const payload = {
        action: 'login',
        email: 'user@example.com',
        ip: '192.168.1.1',
      };

      const result = service.maskTechLogPayload(payload);

      // Action should not be masked
      expect(result.action).toBe('login');
      expect(result.ip).toBe('192.168.1.1');
    });

    it('should handle nested objects', () => {
      const payload = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
        },
        event: 'update',
      };

      const result = service.maskTechLogPayload(payload);

      expect(result.event).toBe('update');
      expect(result.user).toBeDefined();
    });

    it('should handle empty payload', () => {
      const result = service.maskTechLogPayload({});

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('maskIntegrationLogBody', () => {
    it('should return null for null input', () => {
      const result = service.maskIntegrationLogBody(null);

      expect(result).toBeNull();
    });

    it('should mask sensitive fields in request body', () => {
      const body = {
        customerId: 'cust-123',
        phone: '+1234567890',
        metadata: { key: 'value' },
      };

      const result = service.maskIntegrationLogBody(body);

      expect(result?.customerId).toBe('cust-123');
      expect(result?.metadata).toBeDefined();
    });
  });
});
