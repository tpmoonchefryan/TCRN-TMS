// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationLogService } from '../../../log';
import { PiiClientService, PiiProfile } from '../pii-client.service';

// Mock axios with importOriginal to preserve AxiosError
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { 
    ...actual,
    default: mockAxios,
  };
});

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

describe('PiiClientService', () => {
  let service: PiiClientService;
  let mockConfigService: Partial<ConfigService>;
  let mockIntegrationLogService: Partial<IntegrationLogService>;

  const testPiiServiceUrl = 'https://pii.example.com';
  const testProfileId = 'profile-123';
  const testAccessToken = 'test-access-token';
  const testTenantId = 'tenant-abc';

  const mockProfile: PiiProfile = {
    id: testProfileId,
    givenName: 'John',
    familyName: 'Doe',
    gender: 'male',
    birthDate: '1990-01-01',
    phoneNumbers: [{ typeCode: 'mobile', number: '+1234567890', isPrimary: true }],
    emails: [{ typeCode: 'work', address: 'john@example.com', isPrimary: true }],
    addresses: [],
    updatedAt: '2026-01-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          PII_CLIENT_CERT_PATH: undefined,
          PII_CLIENT_KEY_PATH: undefined,
          PII_CA_CERT_PATH: undefined,
        };
        return config[key];
      }),
    };

    mockIntegrationLogService = {
      logOutbound: vi.fn().mockResolvedValue(undefined),
    };

    service = new PiiClientService(
      mockConfigService as ConfigService,
      mockIntegrationLogService as IntegrationLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile when request succeeds', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { data: mockProfile },
        headers: { 'x-request-id': 'req-123' },
      });

      const result = await service.getProfile(
        testPiiServiceUrl,
        testProfileId,
        testAccessToken,
        testTenantId,
      );

      expect(result).toEqual(mockProfile);
      expect(axios.get).toHaveBeenCalledWith(
        `${testPiiServiceUrl}/api/v1/profiles/${testProfileId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testAccessToken}`,
            'X-Tenant-ID': testTenantId,
          }),
        }),
      );
      expect(mockIntegrationLogService.logOutbound).toHaveBeenCalledWith(
        expect.objectContaining({
          externalSystem: 'pii-service',
          method: 'GET',
          success: true,
        }),
      );
    });

    it('should throw and log error when request fails', async () => {
      const mockError = new AxiosError(
        'Not found',
        '404',
        {} as InternalAxiosRequestConfig,
        {},
        { status: 404, data: { error: 'Not found' }, headers: new AxiosHeaders() } as AxiosResponse,
      );
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      await expect(
        service.getProfile(testPiiServiceUrl, testProfileId, testAccessToken, testTenantId),
      ).rejects.toThrow();

      expect(mockIntegrationLogService.logOutbound).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Not found',
        }),
      );
    });
  });

  describe('createProfile', () => {
    it('should create profile and return result', async () => {
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: { data: { id: testProfileId, createdAt: '2026-01-20T10:00:00Z' } },
        headers: {},
      });

      const newProfile = {
        id: testProfileId,
        profileStoreId: 'store-123',
        givenName: 'Jane',
        familyName: 'Doe',
      };

      const result = await service.createProfile(
        testPiiServiceUrl,
        newProfile,
        testAccessToken,
        testTenantId,
      );

      expect(result).toEqual({ id: testProfileId, createdAt: '2026-01-20T10:00:00Z' });
      expect(axios.post).toHaveBeenCalledWith(
        `${testPiiServiceUrl}/api/v1/profiles`,
        newProfile,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return result', async () => {
      (axios.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { data: { id: testProfileId, updatedAt: '2026-01-21T10:00:00Z' } },
        headers: {},
      });

      const updates = { givenName: 'Updated Name' };

      const result = await service.updateProfile(
        testPiiServiceUrl,
        testProfileId,
        updates,
        testAccessToken,
        testTenantId,
      );

      expect(result).toEqual({ id: testProfileId, updatedAt: '2026-01-21T10:00:00Z' });
      expect(axios.patch).toHaveBeenCalledWith(
        `${testPiiServiceUrl}/api/v1/profiles/${testProfileId}`,
        updates,
        expect.any(Object),
      );
    });
  });

  describe('batchGetProfiles', () => {
    it('should batch get profiles', async () => {
      const ids = ['profile-1', 'profile-2', 'profile-3'];
      const mockData = {
        'profile-1': { id: 'profile-1', givenName: 'User 1' },
        'profile-2': { id: 'profile-2', givenName: 'User 2' },
      };
      const mockErrors = {
        'profile-3': { code: 'NOT_FOUND', message: 'Profile not found' },
      };

      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { data: mockData, errors: mockErrors },
        headers: {},
      });

      const result = await service.batchGetProfiles(
        testPiiServiceUrl,
        ids,
        ['givenName'],
        testAccessToken,
        testTenantId,
      );

      expect(result.data).toEqual(mockData);
      expect(result.errors).toEqual(mockErrors);
      expect(axios.post).toHaveBeenCalledWith(
        `${testPiiServiceUrl}/api/v1/profiles/batch`,
        { ids, fields: ['givenName'] },
        expect.any(Object),
      );
    });

    it('should handle empty batch result', async () => {
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
      });

      const result = await service.batchGetProfiles(
        testPiiServiceUrl,
        ['profile-1'],
        undefined,
        testAccessToken,
        testTenantId,
      );

      expect(result.data).toEqual({});
      expect(result.errors).toEqual({});
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      (axios.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        headers: {},
      });

      await expect(
        service.deleteProfile(testPiiServiceUrl, testProfileId, testAccessToken, testTenantId),
      ).resolves.not.toThrow();

      expect(axios.delete).toHaveBeenCalledWith(
        `${testPiiServiceUrl}/api/v1/profiles/${testProfileId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testAccessToken}`,
          }),
        }),
      );
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      const result = await service.checkHealth(testPiiServiceUrl);

      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error status when request fails', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkHealth(testPiiServiceUrl);

      expect(result.status).toBe('error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable error codes', async () => {
      const timeoutError = new AxiosError('Timeout', 'ETIMEDOUT');
      (axios.get as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          status: 200,
          data: { data: mockProfile },
          headers: {},
        });

      // Mock sleep to avoid actual delays
      vi.spyOn(service as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await service.getProfile(
        testPiiServiceUrl,
        testProfileId,
        testAccessToken,
        testTenantId,
      );

      expect(result).toEqual(mockProfile);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 status code', async () => {
      const serviceUnavailableError = new AxiosError(
        'Service Unavailable',
        '503',
        {} as InternalAxiosRequestConfig,
        {},
        { status: 503, data: {}, headers: new AxiosHeaders() } as AxiosResponse,
      );
      (axios.get as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(serviceUnavailableError)
        .mockResolvedValueOnce({
          status: 200,
          data: { data: mockProfile },
          headers: {},
        });

      vi.spyOn(service as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await service.getProfile(
        testPiiServiceUrl,
        testProfileId,
        testAccessToken,
        testTenantId,
      );

      expect(result).toEqual(mockProfile);
    });

    it('should not retry on 404 status code', async () => {
      const notFoundError = new AxiosError(
        'Not Found',
        '404',
        {} as InternalAxiosRequestConfig,
        {},
        { status: 404, data: {}, headers: new AxiosHeaders() } as AxiosResponse,
      );
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundError);

      await expect(
        service.getProfile(testPiiServiceUrl, testProfileId, testAccessToken, testTenantId),
      ).rejects.toThrow();

      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries', async () => {
      const timeoutError = new AxiosError('Timeout', 'ETIMEDOUT');
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(timeoutError);

      vi.spyOn(service as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      await expect(
        service.getProfile(testPiiServiceUrl, testProfileId, testAccessToken, testTenantId),
      ).rejects.toThrow();

      // Initial attempt + 3 retries = 4 total calls
      expect(axios.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('mTLS Configuration', () => {
    it('should initialize with mTLS when certificates are configured', () => {
      const mtlsConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          const config: Record<string, string> = {
            PII_CLIENT_CERT_PATH: '/path/to/cert.pem',
            PII_CLIENT_KEY_PATH: '/path/to/key.pem',
            PII_CA_CERT_PATH: '/path/to/ca.pem',
          };
          return config[key];
        }),
      };

      // Create new service with mTLS config
      const mtlsService = new PiiClientService(
        mtlsConfigService as ConfigService,
        mockIntegrationLogService as IntegrationLogService,
      );

      // Service should be created without errors
      expect(mtlsService).toBeDefined();
    });
  });
});
