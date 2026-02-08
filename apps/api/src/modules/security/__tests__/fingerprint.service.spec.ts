// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FingerprintService } from '../services/fingerprint.service';

describe('FingerprintService', () => {
  let service: FingerprintService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          FINGERPRINT_SECRET_KEY: 'test-secret-key-that-is-at-least-32-chars',
          FINGERPRINT_PREVIOUS_KEY: 'old-secret-key-that-is-at-least-32-chars',
          FINGERPRINT_KEY_VERSION: 'v1',
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    service = new FingerprintService(configService);
  });

  describe('generateFingerprint', () => {
    it('should generate a fingerprint', () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      const fingerprint = service.generateFingerprint(tenantId, userId);

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBe(64); // SHA256 hex = 64 chars
    });

    it('should generate consistent fingerprint for same inputs', () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      const fp1 = service.generateFingerprint(tenantId, userId);
      const fp2 = service.generateFingerprint(tenantId, userId);

      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = service.generateFingerprint('tenant-1', 'user-1');
      const fp2 = service.generateFingerprint('tenant-2', 'user-1');
      const fp3 = service.generateFingerprint('tenant-1', 'user-2');

      expect(fp1).not.toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp2).not.toBe(fp3);
    });
  });

  describe('generateVersionedFingerprint', () => {
    it('should return fingerprint with version', () => {
      const result = service.generateVersionedFingerprint('tenant-123', 'user-456');

      expect(result.fingerprint).toBeDefined();
      expect(result.version).toBe('v1');
    });
  });

  describe('generateShortFingerprint', () => {
    it('should return first 16 characters of fingerprint', () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      const fullFp = service.generateFingerprint(tenantId, userId);
      const shortFp = service.generateShortFingerprint(tenantId, userId);

      expect(shortFp.length).toBe(16);
      expect(fullFp.startsWith(shortFp)).toBe(true);
    });
  });

  describe('verifyFingerprint', () => {
    it('should verify valid fingerprint', () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';
      const fingerprint = service.generateFingerprint(tenantId, userId);

      const isValid = service.verifyFingerprint(fingerprint, tenantId, userId);

      expect(isValid).toBe(true);
    });

    it('should reject invalid fingerprint', () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';
      const invalidFingerprint = 'a'.repeat(64);

      const isValid = service.verifyFingerprint(invalidFingerprint, tenantId, userId);

      expect(isValid).toBe(false);
    });

    it('should reject tampered fingerprint', () => {
      const fingerprint = service.generateFingerprint('tenant-123', 'user-456');
      
      // Verify with different tenant/user
      const isValid = service.verifyFingerprint(fingerprint, 'tenant-999', 'user-456');

      expect(isValid).toBe(false);
    });

    it('should handle malformed fingerprint gracefully', () => {
      const isValid = service.verifyFingerprint('invalid', 'tenant-123', 'user-456');

      expect(isValid).toBe(false);
    });
  });

  describe('verifyWithRotation', () => {
    it('should verify with current key', () => {
      const fingerprint = service.generateFingerprint('tenant-123', 'user-456');

      const result = service.verifyWithRotation(fingerprint, 'tenant-123', 'user-456');

      expect(result.valid).toBe(true);
      expect(result.keyVersion).toBe('v1');
    });

    it('should reject invalid fingerprint', () => {
      const result = service.verifyWithRotation('a'.repeat(64), 'tenant-123', 'user-456');

      expect(result.valid).toBe(false);
      expect(result.keyVersion).toBe('invalid');
    });
  });

  describe('key rotation', () => {
    it('should verify fingerprint from previous key', () => {
      // Create service with only old key
      const oldConfigService = {
        get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
          const config: Record<string, string> = {
            FINGERPRINT_SECRET_KEY: 'old-secret-key-that-is-at-least-32-chars',
            FINGERPRINT_KEY_VERSION: 'v0',
          };
          return config[key] ?? defaultValue;
        }),
      } as unknown as ConfigService;

      const oldService = new FingerprintService(oldConfigService);
      const oldFingerprint = oldService.generateFingerprint('tenant-123', 'user-456');

      // Verify with new service (which has old key as previous)
      const result = service.verifyWithRotation(oldFingerprint, 'tenant-123', 'user-456');

      expect(result.valid).toBe(true);
      expect(result.keyVersion).toBe('previous');
    });
  });
});
