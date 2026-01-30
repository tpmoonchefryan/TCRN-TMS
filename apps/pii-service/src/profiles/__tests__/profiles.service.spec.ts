// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Profiles Service Unit Tests

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtContext } from '../../auth/strategies/jwt.strategy';
import { ProfilesService } from '../services/profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCryptoService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAuditService: any;

  const mockUserContext: JwtContext = {
    type: 'user',
    userId: 'user-123',
    tenantId: 'tenant-456',
    tenantSchema: 'tenant_test',
    profileId: 'profile-789',
    profileStoreId: 'store-abc',
    allowedActions: ['read', 'write'],
    jti: 'jti-123',
  };

  const mockServiceContext: JwtContext = {
    type: 'service',
    service: 'report-service',
    tenantId: 'tenant-456',
    profileStoreId: 'store-abc',
    jobId: 'job-123',
    originalUserId: 'user-789',
    allowedActions: ['batch_read'],
    jti: 'jti-456',
  };

  const mockPiiProfile = {
    id: 'profile-789',
    tenantId: 'tenant-456',
    profileStoreId: 'store-abc',
    givenName: Buffer.from('encrypted-given-name'),
    familyName: Buffer.from('encrypted-family-name'),
    gender: 'male',
    birthDate: Buffer.from('encrypted-birth-date'),
    phoneNumbers: Buffer.from('encrypted-phones'),
    emails: Buffer.from('encrypted-emails'),
    addresses: Buffer.from('encrypted-addresses'),
    dataHash: 'hash-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      piiProfile: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockCryptoService = {
      encryptString: vi.fn().mockResolvedValue(Buffer.from('encrypted')),
      decryptString: vi.fn().mockImplementation((_, buf) => {
        if (!buf) return null;
        return 'decrypted-value';
      }),
      encryptJson: vi.fn().mockResolvedValue(Buffer.from('encrypted-json')),
      decryptJson: vi.fn().mockResolvedValue([{ typeCode: 'MOBILE', number: '+1234567890' }]),
      computeHash: vi.fn().mockReturnValue('computed-hash'),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProfilesService,
          useFactory: () => {
            // Manually create service with mocked dependencies
            const serviceInstance = new ProfilesService(
              mockPrisma,
              mockCryptoService,
              mockAuditService,
            );
            return serviceInstance;
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  describe('create', () => {
    it('should create a new PII profile', async () => {
      const dto = {
        id: 'new-profile-id',
        profileStoreId: 'store-abc',
        givenName: 'John',
        familyName: 'Doe',
        gender: 'male',
      };

      mockPrisma.piiProfile.create.mockResolvedValue({
        id: dto.id,
        createdAt: new Date(),
      });

      const result = await service.create(dto, mockUserContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(dto.id);
      expect(mockCryptoService.encryptString).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          tenantId: mockUserContext.tenantId,
        })
      );
    });

    it('should reject creation without write permission', async () => {
      const readOnlyContext: JwtContext = {
        ...mockUserContext,
        allowedActions: ['read'],
      };

      const dto = {
        id: 'new-profile-id',
        profileStoreId: 'store-abc',
        givenName: 'John',
      };

      await expect(service.create(dto, readOnlyContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should return decrypted PII profile', async () => {
      mockPrisma.piiProfile.findFirst.mockResolvedValue(mockPiiProfile);

      const result = await service.findById('profile-789', mockUserContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPiiProfile.id);
      expect(mockCryptoService.decryptString).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
          profileId: 'profile-789',
        })
      );
    });

    it('should throw NotFoundException for non-existent profile', async () => {
      mockPrisma.piiProfile.findFirst.mockResolvedValue(null);

      // Use matching profileId to pass permission check, then test NotFoundException
      const contextWithMatchingId: JwtContext = {
        ...mockUserContext,
        profileId: 'non-existent',
      };

      await expect(service.findById('non-existent', contextWithMatchingId)).rejects.toThrow(NotFoundException);
    });

    it('should reject access to different profile for user token', async () => {
      const contextForDifferentProfile: JwtContext = {
        ...mockUserContext,
        profileId: 'different-profile-id',
      };

      await expect(
        service.findById('profile-789', contextForDifferentProfile)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update PII profile fields', async () => {
      mockPrisma.piiProfile.findFirst.mockResolvedValue(mockPiiProfile);
      mockPrisma.piiProfile.update.mockResolvedValue({
        id: mockPiiProfile.id,
        updatedAt: new Date(),
      });

      const dto = {
        givenName: 'Jane',
        gender: 'female',
      };

      const result = await service.update('profile-789', dto, mockUserContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPiiProfile.id);
      expect(mockPrisma.piiProfile.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
        })
      );
    });

    it('should reject update without write permission', async () => {
      const readOnlyContext: JwtContext = {
        ...mockUserContext,
        allowedActions: ['read'],
      };

      await expect(
        service.update('profile-789', { givenName: 'Jane' }, readOnlyContext)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('batchGet', () => {
    it('should allow batch read for service token', async () => {
      mockPrisma.piiProfile.findMany.mockResolvedValue([mockPiiProfile]);

      const dto = {
        ids: ['profile-789'],
        fields: ['givenName', 'familyName'],
      };

      const result = await service.batchGet(dto, mockServiceContext);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'batch_read',
        })
      );
    });

    it('should reject batch read for user token', async () => {
      const dto = {
        ids: ['profile-789'],
      };

      await expect(service.batchGet(dto, mockUserContext)).rejects.toThrow(ForbiddenException);
    });

    it('should return errors for not found profiles', async () => {
      mockPrisma.piiProfile.findMany.mockResolvedValue([]);

      const dto = {
        ids: ['non-existent-1', 'non-existent-2'],
      };

      const result = await service.batchGet(dto, mockServiceContext);

      expect(Object.keys(result.errors)).toHaveLength(2);
      expect(result.errors['non-existent-1'].code).toBe('NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('should delete PII profile', async () => {
      mockPrisma.piiProfile.findFirst.mockResolvedValue(mockPiiProfile);
      mockPrisma.piiProfile.delete.mockResolvedValue(mockPiiProfile);

      await service.delete('profile-789', mockUserContext);

      expect(mockPrisma.piiProfile.delete).toHaveBeenCalledWith({
        where: { id: 'profile-789' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
        })
      );
    });

    it('should throw NotFoundException for non-existent profile', async () => {
      mockPrisma.piiProfile.findFirst.mockResolvedValue(null);

      await expect(service.delete('non-existent', mockUserContext)).rejects.toThrow(NotFoundException);
    });
  });
});
