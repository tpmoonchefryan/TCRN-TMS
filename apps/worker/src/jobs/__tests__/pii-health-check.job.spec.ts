// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type PiiHealthCheckJobData,
  piiHealthCheckJobProcessor,
  type PiiHealthCheckJobResult,
} from '../pii-health-check.job';

const mockPrisma = {
  tenant: {
    findMany: vi.fn(),
  },
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $disconnect: vi.fn(),
};

vi.mock('@tcrn/database', () => ({
  PrismaClient: class MockPrismaClient {
    tenant = mockPrisma.tenant;
    $queryRawUnsafe = mockPrisma.$queryRawUnsafe;
    $executeRawUnsafe = mockPrisma.$executeRawUnsafe;
    $disconnect = mockPrisma.$disconnect;
  },
}));

describe('PiiHealthCheckJobProcessor', () => {
  let mockJob: Job<PiiHealthCheckJobData, PiiHealthCheckJobResult>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());

    mockJob = {
      data: {
        jobId: 'pii-health-job-1',
        checkAll: false,
      },
      updateProgress: vi.fn(),
    } as unknown as Job<PiiHealthCheckJobData, PiiHealthCheckJobResult>;
  });

  it('checks tenant-local PII configs referenced by active profile stores', async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([
      { schemaName: 'tenant_ac' },
      { schemaName: 'tenant_default' },
    ]);

    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          configId: 'cfg-ac-1',
          configCode: 'DEFAULT_PII',
          apiUrl: 'https://pii.ac.example',
          isHealthy: false,
        },
      ])
      .mockResolvedValueOnce([]);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ status: 'ok' }),
    } as Response);

    const result = await piiHealthCheckJobProcessor(mockJob);

    expect(result.totalConfigs).toBe(1);
    expect(result.healthyCount).toBe(1);
    expect(result.results).toEqual([
      expect.objectContaining({
        tenantSchema: 'tenant_ac',
        configId: 'cfg-ac-1',
        configCode: 'DEFAULT_PII',
        apiUrl: 'https://pii.ac.example',
        status: 'ok',
      }),
    ]);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "tenant_ac".pii_service_config'),
      true,
      'cfg-ac-1',
    );
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });

  it('skips broken tenant schemas without failing the whole job', async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([
      { schemaName: 'tenant_broken' },
      { schemaName: 'tenant_ok' },
    ]);

    mockPrisma.$queryRawUnsafe
      .mockRejectedValueOnce(new Error('relation "tenant_broken".pii_service_config does not exist'))
      .mockResolvedValueOnce([
        {
          configId: 'cfg-ok-1',
          configCode: 'REMOTE_PII',
          apiUrl: 'https://pii.ok.example',
          isHealthy: true,
        },
      ]);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ status: 'ok' }),
    } as Response);

    const result = await piiHealthCheckJobProcessor(mockJob);

    expect(result.totalConfigs).toBe(1);
    expect(result.results[0]).toMatchObject({
      tenantSchema: 'tenant_ok',
      configCode: 'REMOTE_PII',
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('returns early when no tenant-local PII configs are referenced', async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([{ schemaName: 'tenant_empty' }]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const result = await piiHealthCheckJobProcessor(mockJob);

    expect(result.totalConfigs).toBe(0);
    expect(result.results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
