// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileType } from '../../../customer/dto/customer.dto';
import { IntegrationLogService } from '../../../log';
import { ReportFormat, ReportType } from '../../../report/dto/report.dto';
import { PiiClientService } from '../pii-client.service';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

describe('PiiClientService', () => {
  let service: PiiClientService;
  let mockConfigService: Partial<ConfigService>;
  let mockIntegrationLogService: Partial<IntegrationLogService>;

  const testPiiPlatformUrl = 'https://pii.example.com';
  const testTenantId = 'tenant-abc';
  const testTenantSchema = 'tenant_test';
  const testAccessToken = 'test-access-token';

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

  describe('upsertCustomerPii', () => {
    it('writes customer pii to the external platform', async () => {
      (axios.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: {
          data: {
            customerId: 'customer-1',
            syncedAt: '2026-04-15T02:00:00.000Z',
          },
        },
        headers: {},
      });

      const result = await service.upsertCustomerPii(
        testPiiPlatformUrl,
        {
          customerId: 'customer-1',
          talentId: 'talent-1',
          profileType: ProfileType.INDIVIDUAL,
          pii: {
            givenName: 'John',
            familyName: 'Doe',
          },
          ownerScope: {
            ownerType: 'talent',
            ownerId: 'talent-1',
          },
          operator: {
            id: 'user-1',
            username: 'operator',
          },
          trace: {
            requestId: 'req-1',
            tenantId: testTenantId,
          },
        },
        testAccessToken,
        testTenantId,
        testTenantSchema,
      );

      expect(result).toEqual({
        customerId: 'customer-1',
        syncedAt: '2026-04-15T02:00:00.000Z',
      });
      expect(axios.put).toHaveBeenCalledWith(
        `${testPiiPlatformUrl}/api/v1/tms/customers/customer-1/pii`,
        expect.objectContaining({
          customerId: 'customer-1',
          profileType: 'individual',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testAccessToken}`,
            'X-Tenant-ID': testTenantId,
          }),
        }),
      );
    });
  });

  describe('createPortalSession', () => {
    it('creates a pii portal session', async () => {
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: {
          data: {
            redirectUrl: 'https://pii.example.com/portal/sessions/session-1',
            expiresAt: '2026-04-15T02:30:00.000Z',
          },
        },
        headers: {},
      });

      const result = await service.createPortalSession(
        testPiiPlatformUrl,
        {
          customerId: 'customer-1',
          talentId: 'talent-1',
          profileType: ProfileType.COMPANY,
          ownerScope: {
            ownerType: 'subsidiary',
            ownerId: 'subsidiary-1',
          },
          operator: {
            id: 'user-1',
            username: 'operator',
          },
          trace: {
            requestId: 'req-1',
            tenantId: testTenantId,
          },
          purpose: 'customer_view',
        },
        testAccessToken,
        testTenantId,
        testTenantSchema,
      );

      expect(result).toEqual({
        redirectUrl: 'https://pii.example.com/portal/sessions/session-1',
        expiresAt: '2026-04-15T02:30:00.000Z',
      });
      expect(axios.post).toHaveBeenCalledWith(
        `${testPiiPlatformUrl}/api/v1/tms/portal-sessions`,
        expect.objectContaining({
          customerId: 'customer-1',
          purpose: 'customer_view',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testAccessToken}`,
          }),
        }),
      );
      expect(mockIntegrationLogService.logOutbound).toHaveBeenCalledWith(
        expect.objectContaining({
          externalSystem: 'tcrn-pii-platform',
          method: 'POST',
          success: true,
        }),
        expect.objectContaining({
          tenantSchema: testTenantSchema,
        }),
      );
    });

    it('logs a failed portal session request', async () => {
      const mockError = new AxiosError(
        'Forbidden',
        '403',
        {} as InternalAxiosRequestConfig,
        {},
        {
          status: 403,
          data: { error: 'Forbidden' },
          headers: new AxiosHeaders(),
        } as AxiosResponse,
      );
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      await expect(
        service.createPortalSession(
          testPiiPlatformUrl,
          {
            customerId: 'customer-1',
            talentId: 'talent-1',
            profileType: ProfileType.INDIVIDUAL,
            ownerScope: {
              ownerType: 'talent',
              ownerId: 'talent-1',
            },
            operator: {
              id: 'user-1',
              username: 'operator',
            },
            trace: {
              requestId: 'req-1',
              tenantId: testTenantId,
            },
            purpose: 'customer_view',
          },
          testAccessToken,
          testTenantId,
          testTenantSchema,
        ),
      ).rejects.toThrow('Forbidden');

      expect(mockIntegrationLogService.logOutbound).toHaveBeenCalledWith(
        expect.objectContaining({
          externalSystem: 'tcrn-pii-platform',
          success: false,
          errorMessage: 'Forbidden',
        }),
        expect.objectContaining({
          tenantSchema: testTenantSchema,
        }),
      );
    });
  });

  describe('syncCustomerLifecycle', () => {
    it('synchronizes lifecycle state to the external platform', async () => {
      (axios.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: {
          data: {
            customerId: 'customer-1',
            lifecycleStatus: 'inactive',
            syncedAt: '2026-04-15T02:10:00.000Z',
          },
        },
        headers: {},
      });

      const result = await service.syncCustomerLifecycle(
        testPiiPlatformUrl,
        {
          customerId: 'customer-1',
          talentId: 'talent-1',
          profileType: ProfileType.INDIVIDUAL,
          lifecycle: {
            action: 'deactivate',
            isActive: false,
            reasonCode: 'OTHER',
            occurredAt: '2026-04-15T02:05:00.000Z',
          },
          ownerScope: {
            ownerType: 'talent',
            ownerId: 'talent-1',
          },
          operator: {
            id: 'user-1',
            username: 'operator',
          },
          trace: {
            requestId: 'req-1',
            tenantId: testTenantId,
          },
        },
        testAccessToken,
        testTenantId,
        testTenantSchema,
      );

      expect(result).toEqual({
        customerId: 'customer-1',
        lifecycleStatus: 'inactive',
        syncedAt: '2026-04-15T02:10:00.000Z',
      });
      expect(axios.put).toHaveBeenCalledWith(
        `${testPiiPlatformUrl}/api/v1/tms/customers/customer-1/lifecycle`,
        expect.objectContaining({
          lifecycle: expect.objectContaining({
            action: 'deactivate',
            isActive: false,
            reasonCode: 'OTHER',
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testAccessToken}`,
            'X-Tenant-ID': testTenantId,
          }),
        }),
      );
      expect(mockIntegrationLogService.logOutbound).toHaveBeenCalledWith(
        expect.objectContaining({
          externalSystem: 'tcrn-pii-platform',
          method: 'PUT',
          success: true,
        }),
        expect.objectContaining({
          tenantSchema: testTenantSchema,
        }),
      );
    });
  });

  describe('createReportRequest', () => {
    it('creates a platform-side pii report request', async () => {
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: {
          data: {
            requestId: 'report-request-1',
            redirectUrl: 'https://pii.example.com/portal/report-requests/report-request-1',
            expiresAt: '2026-04-15T02:45:00.000Z',
          },
        },
        headers: {},
      });

      const result = await service.createReportRequest(
        testPiiPlatformUrl,
        {
          reportType: ReportType.MFR,
          reportFormat: ReportFormat.XLSX,
          talentId: 'talent-1',
          customerIds: ['customer-1', 'customer-2'],
          requestMetadata: {
            estimatedRows: 12,
            filters: {
              platformCodes: ['youtube'],
            },
          },
          ownerScope: {
            ownerType: 'talent',
            ownerId: 'talent-1',
          },
          operator: {
            id: 'user-1',
            username: 'operator',
          },
          trace: {
            requestId: 'req-1',
            tenantId: testTenantId,
          },
          deliveryMode: 'portal',
        },
        testAccessToken,
        testTenantId,
        testTenantSchema,
      );

      expect(result).toEqual({
        requestId: 'report-request-1',
        redirectUrl: 'https://pii.example.com/portal/report-requests/report-request-1',
        expiresAt: '2026-04-15T02:45:00.000Z',
      });
      expect(axios.post).toHaveBeenCalledWith(
        `${testPiiPlatformUrl}/api/v1/tms/report-requests`,
        expect.objectContaining({
          reportType: ReportType.MFR,
          customerIds: ['customer-1', 'customer-2'],
        }),
        expect.any(Object),
      );
    });
  });

  describe('checkHealth', () => {
    it('returns healthy when the endpoint responds', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      const result = await service.checkHealth(testPiiPlatformUrl);

      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns error when the health probe fails', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkHealth(testPiiPlatformUrl);

      expect(result.status).toBe('error');
    });
  });

  describe('Retry Logic', () => {
    it('retries portal session creation on retryable transport errors', async () => {
      const timeoutError = new AxiosError('Timeout', 'ETIMEDOUT');
      (axios.post as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          status: 201,
          data: {
            data: {
              redirectUrl: 'https://pii.example.com/portal/sessions/session-1',
              expiresAt: '2026-04-15T02:30:00.000Z',
            },
          },
          headers: {},
        });

      vi.spyOn(service as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
        .mockResolvedValue(undefined);

      const result = await service.createPortalSession(
        testPiiPlatformUrl,
        {
          customerId: 'customer-1',
          talentId: 'talent-1',
          profileType: ProfileType.INDIVIDUAL,
          ownerScope: {
            ownerType: 'talent',
            ownerId: 'talent-1',
          },
          operator: {
            id: 'user-1',
            username: 'operator',
          },
          trace: {
            requestId: 'req-1',
            tenantId: testTenantId,
          },
          purpose: 'customer_view',
        },
        testAccessToken,
        testTenantId,
      );

      expect(result.redirectUrl).toContain('/portal/sessions/');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('does not retry portal session creation on 404 errors', async () => {
      const notFoundError = new AxiosError(
        'Not Found',
        '404',
        {} as InternalAxiosRequestConfig,
        {},
        {
          status: 404,
          data: {},
          headers: new AxiosHeaders(),
        } as AxiosResponse,
      );
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundError);

      await expect(
        service.createPortalSession(
          testPiiPlatformUrl,
          {
            customerId: 'customer-1',
            talentId: 'talent-1',
            profileType: ProfileType.INDIVIDUAL,
            ownerScope: {
              ownerType: 'talent',
              ownerId: 'talent-1',
            },
            operator: {
              id: 'user-1',
              username: 'operator',
            },
            trace: {
              requestId: 'req-1',
              tenantId: testTenantId,
            },
            purpose: 'customer_view',
          },
          testAccessToken,
          testTenantId,
        ),
      ).rejects.toThrow();

      expect(axios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('mTLS Configuration', () => {
    it('initializes with mTLS when certificates are configured', () => {
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

      const mtlsService = new PiiClientService(
        mtlsConfigService as ConfigService,
        mockIntegrationLogService as IntegrationLogService,
      );

      expect(mtlsService).toBeDefined();
    });
  });
});
