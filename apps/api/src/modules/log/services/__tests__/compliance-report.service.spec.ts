// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComplianceReportService } from '../compliance-report.service';

function createService() {
  const tenantFindUnique = vi.fn();
  const queryRawUnsafe = vi.fn();
  const databaseService = {
    getPrisma: () => ({
      tenant: {
        findUnique: tenantFindUnique,
      },
      $queryRawUnsafe: queryRawUnsafe,
    }),
  };

  return {
    tenantFindUnique,
    queryRawUnsafe,
    service: new ComplianceReportService(databaseService as never),
  };
}

describe('ComplianceReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the canonical tenant-local logging tables for compliance metrics', async () => {
    const { tenantFindUnique, queryRawUnsafe, service } = createService();
    tenantFindUnique.mockResolvedValue({ schemaName: 'tenant_security' });
    queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "tenant_security".change_log')) {
        return [{ count: 11n }];
      }

      if (sql.includes('FROM "tenant_security".technical_event_log')) {
        return [{ count: 7n }];
      }

      if (
        sql.includes('FROM "tenant_security".integration_log') &&
        sql.includes('COUNT(*) as count')
      ) {
        return [{ count: 5n }];
      }

      if (
        sql.includes('FROM "tenant_security".integration_log') &&
        sql.includes('COUNT(*) as total')
      ) {
        return [{ total: 4n, success_count: 3n, avg_latency: 125 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const startDate = new Date('2026-05-01T00:00:00.000Z');
    const endDate = new Date('2026-05-02T00:00:00.000Z');
    const report = await service.generateReport('tenant-1', startDate, endDate);

    expect(tenantFindUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      select: { schemaName: true },
    });
    const sqlCalls = queryRawUnsafe.mock.calls.map((call) => String(call[0]));
    expect(queryRawUnsafe).toHaveBeenCalledTimes(4);
    expect(sqlCalls.some((sql) => sql.includes('FROM "tenant_security".change_log'))).toBe(true);
    expect(
      sqlCalls.some(
        (sql) =>
          sql.includes('FROM "tenant_security".technical_event_log') &&
          sql.includes('occurred_at >= $1') &&
          !sql.includes('tech_event_log')
      )
    ).toBe(true);
    expect(
      sqlCalls.filter((sql) => sql.includes('FROM "tenant_security".integration_log')).length
    ).toBe(2);
    expect(report.auditMetrics).toEqual({
      totalChangeLogEntries: 11,
      totalTechEventEntries: 7,
      totalIntegrationLogEntries: 5,
    });
    expect(report.integrationMetrics).toEqual({
      totalApiCalls: 4,
      successRate: 75,
      avgLatencyMs: 125,
    });
  });

  it('fails soft when the tenant schema is unavailable', async () => {
    const { tenantFindUnique, queryRawUnsafe, service } = createService();
    tenantFindUnique.mockResolvedValue(null);

    const report = await service.generateReport(
      'tenant-missing',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-02T00:00:00.000Z'),
    );

    expect(queryRawUnsafe).not.toHaveBeenCalled();
    expect(report.auditMetrics).toEqual({
      totalChangeLogEntries: 0,
      totalTechEventEntries: 0,
      totalIntegrationLogEntries: 0,
    });
    expect(report.integrationMetrics).toEqual({
      totalApiCalls: 0,
      successRate: 100,
      avgLatencyMs: 0,
    });
  });
});
