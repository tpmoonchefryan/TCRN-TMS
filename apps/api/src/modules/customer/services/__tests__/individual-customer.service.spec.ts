// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService, TechEventLogService } from '../../../log';
import { PiiClientService, PiiJwtService } from '../../../pii';
import { IndividualCustomerService } from '../individual-customer.service';

describe('IndividualCustomerService', () => {
  let service: IndividualCustomerService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockTechEventLogService: Partial<TechEventLogService>;
  let mockPiiClientService: Partial<PiiClientService>;
  let mockPiiJwtService: Partial<PiiJwtService>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockTx: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockRuntimeConfig = {
    apiUrl: 'https://pii-api.example.com',
    piiServiceUrl: 'https://pii-proxy.example.com',
  };

  const mockCustomer = {
    id: 'customer-123',
    profileType: 'individual',
    profileStoreId: 'store-123',
    rmProfileId: 'rm-123',
    version: 1,
    nickname: 'Test User',
    primaryLanguage: 'ja',
    statusId: null,
    tags: ['vip'],
    notes: null,
  };

  const mockContext = {
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    userId: 'user-123',
    userName: 'Test User',
    requestId: 'req-123',
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $transaction: vi.fn().mockImplementation(async (callback: (tx: typeof mockTx) => unknown) =>
        callback(mockTx)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockTechEventLogService = {
      log: vi.fn().mockResolvedValue(undefined),
      piiAccess: vi.fn().mockResolvedValue(undefined),
      warn: vi.fn().mockResolvedValue(undefined),
    };

    mockPiiClientService = {
      createProfile: vi.fn().mockResolvedValue({
        id: 'rm-123',
        createdAt: '2026-03-28T00:00:00.000Z',
      }),
      updateProfile: vi.fn().mockResolvedValue({
        id: 'rm-123',
        updatedAt: '2026-03-28T00:00:00.000Z',
      }),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
    };

    mockPiiJwtService = {
      issueAccessToken: vi.fn().mockResolvedValue({
        token: 'pii-access-token',
        expiresIn: 300,
        jti: 'jti-123',
      }),
    };

    service = new IndividualCustomerService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockTechEventLogService as TechEventLogService,
      mockPiiClientService as PiiClientService,
      mockPiiJwtService as PiiJwtService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('fails closed when pii is submitted without an active pii backend', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'talent-123', profileStoreId: 'store-123' },
      ]);

      vi.spyOn(service as any, 'resolveEnabledPiiRuntime').mockRejectedValue(
        new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'PII is not enabled for this profile store',
        }),
      );

      await expect(service.create({
        talentId: 'talent-123',
        nickname: 'Test User',
        pii: {
          givenName: 'John',
          familyName: 'Doe',
        },
      }, mockContext as any)).rejects.toThrow(BadRequestException);

      expect(mockPiiJwtService.issueAccessToken).not.toHaveBeenCalled();
      expect(mockPiiClientService.createProfile).not.toHaveBeenCalled();
    });

    it('creates a remote pii profile before writing the customer record', async () => {
      const createdAt = new Date('2026-03-28T00:00:00.000Z');
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'talent-123', profileStoreId: 'store-123' },
      ]);
      mockTx.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'customer-123', nickname: 'Test User', createdAt },
      ]);

      vi.spyOn(service as any, 'resolveEnabledPiiRuntime').mockResolvedValue(mockRuntimeConfig);

      const result = await service.create({
        talentId: 'talent-123',
        nickname: 'Test User',
        pii: {
          givenName: 'John',
          familyName: 'Doe',
        },
      }, mockContext as any);

      expect(mockPiiJwtService.issueAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          tenantId: 'tenant-123',
          tenantSchema: 'tenant_test',
          profileStoreId: 'store-123',
          actions: ['write'],
          rmProfileId: expect.any(String),
        }),
      );
      expect(mockPiiClientService.createProfile).toHaveBeenCalledWith(
        mockRuntimeConfig.apiUrl,
        expect.objectContaining({
          id: expect.any(String),
          profileStoreId: 'store-123',
          givenName: 'John',
          familyName: 'Doe',
        }),
        'pii-access-token',
        'tenant-123',
      );
      expect(mockChangeLogService.create).toHaveBeenCalled();
      expect(result.id).toBe('customer-123');
      expect(result.individual.searchHintName).toBe('D*n');
    });

    it('attempts remote compensation when customer transaction fails after pii creation', async () => {
      const dbFailure = new Error('transaction failed');
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'talent-123', profileStoreId: 'store-123' },
      ]);
      mockPrisma.$transaction.mockRejectedValue(dbFailure);

      vi.spyOn(service as any, 'resolveEnabledPiiRuntime').mockResolvedValue(mockRuntimeConfig);

      await expect(service.create({
        talentId: 'talent-123',
        nickname: 'Test User',
        pii: {
          givenName: 'John',
        },
      }, mockContext as any)).rejects.toThrow('transaction failed');

      expect(mockPiiClientService.createProfile).toHaveBeenCalled();
      expect(mockPiiClientService.deleteProfile).toHaveBeenCalledWith(
        mockRuntimeConfig.apiUrl,
        expect.any(String),
        'pii-access-token',
        'tenant-123',
      );
    });
  });

  describe('requestPiiAccess', () => {
    it('returns a real pii token response using the resolved profile-store config', async () => {
      vi.spyOn(service as any, 'verifyAccess').mockResolvedValue(mockCustomer);
      vi.spyOn(service as any, 'resolveEnabledPiiRuntime').mockResolvedValue(mockRuntimeConfig);

      const result = await service.requestPiiAccess(
        'customer-123',
        'talent-123',
        mockContext as any,
      );

      expect(mockPiiJwtService.issueAccessToken).toHaveBeenCalledWith({
        userId: 'user-123',
        tenantId: 'tenant-123',
        tenantSchema: 'tenant_test',
        rmProfileId: 'rm-123',
        profileStoreId: 'store-123',
        actions: ['read'],
      });
      expect(result).toEqual({
        accessToken: 'pii-access-token',
        piiProfileId: 'rm-123',
        expiresIn: 300,
        piiServiceUrl: 'https://pii-proxy.example.com',
      });
    });
  });

  describe('updatePii', () => {
    it('updates the remote pii profile with a real write token', async () => {
      vi.spyOn(service as any, 'verifyAccess').mockResolvedValue(mockCustomer);
      vi.spyOn(service as any, 'resolveEnabledPiiRuntime').mockResolvedValue(mockRuntimeConfig);

      const result = await service.updatePii(
        'customer-123',
        'talent-123',
        {
          version: 1,
          pii: {
            givenName: 'Jane',
            familyName: 'Doe',
            phoneNumbers: [
              {
                typeCode: 'mobile',
                number: '+81-90-1234-5678',
                isPrimary: true,
              },
            ],
          },
        },
        mockContext as any,
      );

      expect(mockPiiJwtService.issueAccessToken).toHaveBeenCalledWith({
        userId: 'user-123',
        tenantId: 'tenant-123',
        tenantSchema: 'tenant_test',
        rmProfileId: 'rm-123',
        profileStoreId: 'store-123',
        actions: ['write'],
      });
      expect(mockPiiClientService.updateProfile).toHaveBeenCalledWith(
        mockRuntimeConfig.apiUrl,
        'rm-123',
        {
          givenName: 'Jane',
          familyName: 'Doe',
          phoneNumbers: [
            {
              typeCode: 'mobile',
              number: '+81-90-1234-5678',
              isPrimary: true,
            },
          ],
        },
        'pii-access-token',
        'tenant-123',
      );
      expect(result).toEqual({
        id: 'customer-123',
        searchHintName: 'D*e',
        searchHintPhoneLast4: '5678',
        message: 'PII data updated',
      });
    });
  });
});
