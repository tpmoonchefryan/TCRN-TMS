// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database';

/**
 * Compliance Report Summary
 */
export interface ComplianceReportSummary {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  auditMetrics: {
    totalChangeLogEntries: number;
    totalTechEventEntries: number;
    totalIntegrationLogEntries: number;
  };
  securityMetrics: {
    authEvents: number;
    rateLimitEvents: number;
    blockedRequests: number;
  };
  integrationMetrics: {
    totalApiCalls: number;
    successRate: number;
    avgLatencyMs: number;
  };
  generatedAt: Date;
}

@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Generate compliance report for a given period
   * Uses raw SQL to support multi-tenant architecture
   */
  async generateReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReportSummary> {
    this.logger.log(`Generating compliance report for tenant ${tenantId}`);

    const prisma = this.databaseService.getPrisma();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!tenant?.schemaName) {
      return {
        reportPeriod: { startDate, endDate },
        auditMetrics: {
          totalChangeLogEntries: 0,
          totalTechEventEntries: 0,
          totalIntegrationLogEntries: 0,
        },
        securityMetrics: {
          authEvents: 0,
          rateLimitEvents: 0,
          blockedRequests: 0,
        },
        integrationMetrics: {
          totalApiCalls: 0,
          successRate: 100,
          avgLatencyMs: 0,
        },
        generatedAt: new Date(),
      };
    }

    const [auditMetrics, integrationMetrics] = await Promise.all([
      this.getAuditMetrics(prisma, tenant.schemaName, startDate, endDate),
      this.getIntegrationMetrics(prisma, tenant.schemaName, startDate, endDate),
    ]);

    return {
      reportPeriod: { startDate, endDate },
      auditMetrics,
      securityMetrics: {
        authEvents: 0, // Requires tenant-specific query
        rateLimitEvents: 0,
        blockedRequests: 0,
      },
      integrationMetrics,
      generatedAt: new Date(),
    };
  }

  private async getAuditMetrics(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReportSummary['auditMetrics']> {
    try {
      const changeLogResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".change_log
         WHERE occurred_at >= $1 AND occurred_at <= $2`,
        startDate,
        endDate,
      );

      const techEventResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".technical_event_log
         WHERE occurred_at >= $1 AND occurred_at <= $2`,
        startDate,
        endDate,
      );

      const integrationLogResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".integration_log
         WHERE occurred_at >= $1 AND occurred_at <= $2`,
        startDate,
        endDate,
      );

      return {
        totalChangeLogEntries: Number(changeLogResult[0]?.count || 0),
        totalTechEventEntries: Number(techEventResult[0]?.count || 0),
        totalIntegrationLogEntries: Number(integrationLogResult[0]?.count || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get audit metrics: ${error}`);
      return {
        totalChangeLogEntries: 0,
        totalTechEventEntries: 0,
        totalIntegrationLogEntries: 0,
      };
    }
  }

  private async getIntegrationMetrics(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReportSummary['integrationMetrics']> {
    try {
      const result = await prisma.$queryRawUnsafe<
        {
          total: bigint;
          success_count: bigint;
          avg_latency: number | null;
        }[]
      >(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 400) as success_count,
           AVG(latency_ms) as avg_latency
         FROM "${tenantSchema}".integration_log
         WHERE occurred_at >= $1 AND occurred_at <= $2`,
        startDate,
        endDate,
      );

      const total = Number(result[0]?.total || 0);
      const successCount = Number(result[0]?.success_count || 0);
      const avgLatency = result[0]?.avg_latency || 0;

      return {
        totalApiCalls: total,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
        avgLatencyMs: Math.round(avgLatency),
      };
    } catch (error) {
      this.logger.error(`Failed to get integration metrics: ${error}`);
      return {
        totalApiCalls: 0,
        successRate: 100,
        avgLatencyMs: 0,
      };
    }
  }
}
