// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnerType } from '../../integration/dto/integration.dto';
import type { AdapterResolutionService } from '../../integration/services/adapter-resolution.service';
import type { TechEventLogService } from '../../log';
import type { PiiClientService } from '../../pii';
import { ReportFormat, ReportType } from '../dto/report.dto';
import type { MfrReportRepository } from '../infrastructure/mfr-report.repository';
import { ReportPiiPlatformApplicationService } from './report-pii-platform.service';

describe('ReportPiiPlatformApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Operator',
    requestId: 'req-1',
  };

  const mockMfrReportRepository = {
    findTalent: vi.fn(),
    findMatchingCustomerIds: vi.fn(),
  } as unknown as MfrReportRepository;

  const mockAdapterResolutionService = {
    resolveEffectiveAdapter: vi.fn(),
  } as unknown as AdapterResolutionService;

  const mockPiiClientService = {
    createReportRequest: vi.fn(),
  } as unknown as PiiClientService;

  const mockTechEventLogService = {
    log: vi.fn(),
  } as unknown as TechEventLogService;

  const service = new ReportPiiPlatformApplicationService(
    mockMfrReportRepository,
    mockAdapterResolutionService,
    mockPiiClientService,
    mockTechEventLogService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no effective pii-platform adapter exists', async () => {
    vi.mocked(
      mockAdapterResolutionService.resolveEffectiveAdapter,
    ).mockResolvedValue(null);

    await expect(
      service.createMfrReportRequest(
        ReportType.MFR,
        'talent-1',
        {},
        ReportFormat.XLSX,
        12,
        context,
      ),
    ).resolves.toBeNull();

    expect(
      mockAdapterResolutionService.resolveEffectiveAdapter,
    ).toHaveBeenCalledWith(
      {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
        platformCode: 'TCRN_PII_PLATFORM',
      },
      context,
    );
    expect(mockPiiClientService.createReportRequest).not.toHaveBeenCalled();
  });

  it('fails closed when the adapter is active but missing runtime config', async () => {
    vi.mocked(
      mockAdapterResolutionService.resolveEffectiveAdapter,
    ).mockResolvedValue({
      id: 'adapter-1',
      code: 'TCRN_PII_PLATFORM',
      configs: [],
      resolvedFrom: {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
      },
    } as never);

    await expect(
      service.createMfrReportRequest(
        ReportType.MFR,
        'talent-1',
        {},
        ReportFormat.CSV,
        12,
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when the target talent does not exist', async () => {
    vi.mocked(
      mockAdapterResolutionService.resolveEffectiveAdapter,
    ).mockResolvedValue({
      id: 'adapter-1',
      code: 'TCRN_PII_PLATFORM',
      configs: [
        { configKey: 'api_base_url', configValue: 'https://pii-platform.example.com', isSecret: false },
        { configKey: 'service_token', configValue: 'token-1', isSecret: true },
      ],
      resolvedFrom: {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
      },
    } as never);
    vi.mocked(mockMfrReportRepository.findTalent).mockResolvedValue(null);

    await expect(
      service.createMfrReportRequest(
        ReportType.MFR,
        'talent-1',
        {},
        ReportFormat.XLSX,
        12,
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds a report handoff request and returns portal redirect data', async () => {
    vi.mocked(
      mockAdapterResolutionService.resolveEffectiveAdapter,
    ).mockResolvedValue({
      id: 'adapter-1',
      code: 'TCRN_PII_PLATFORM',
      configs: [
        { configKey: 'api_base_url', configValue: 'https://pii-platform.example.com', isSecret: false },
        { configKey: 'service_token', configValue: 'token-1', isSecret: true },
      ],
      resolvedFrom: {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
      },
    } as never);
    vi.mocked(mockMfrReportRepository.findTalent).mockResolvedValue({
      id: 'talent-1',
      profile_store_id: 'store-1',
    } as never);
    vi.mocked(mockMfrReportRepository.findMatchingCustomerIds).mockResolvedValue([
      'customer-1',
      'customer-2',
    ] as never);
    vi.mocked(mockPiiClientService.createReportRequest).mockResolvedValue({
      requestId: 'report-request-1',
      redirectUrl: 'https://pii-platform.example.com/portal/report-requests/report-request-1',
      expiresAt: '2026-04-15T02:00:00.000Z',
    } as never);

    await expect(
      service.createMfrReportRequest(
        ReportType.MFR,
        'talent-1',
        { platformCodes: ['youtube'] },
        ReportFormat.CSV,
        24,
        context,
      ),
    ).resolves.toEqual({
      deliveryMode: 'pii_platform_portal',
      requestId: 'report-request-1',
      redirectUrl: 'https://pii-platform.example.com/portal/report-requests/report-request-1',
      expiresAt: '2026-04-15T02:00:00.000Z',
      estimatedRows: 24,
      customerCount: 2,
    });

    expect(mockPiiClientService.createReportRequest).toHaveBeenCalledWith(
      'https://pii-platform.example.com',
      expect.objectContaining({
        reportType: ReportType.MFR,
        reportFormat: ReportFormat.CSV,
        talentId: 'talent-1',
        customerIds: ['customer-1', 'customer-2'],
        requestMetadata: {
          estimatedRows: 24,
          filters: { platformCodes: ['youtube'] },
        },
      }),
      'token-1',
      'tenant-1',
      'tenant_test',
    );
    expect(mockTechEventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          action: 'pii_platform_report_request_created',
          customerCount: 2,
        }),
      }),
      context,
    );
  });
});
