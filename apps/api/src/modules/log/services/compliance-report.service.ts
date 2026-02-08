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

    // Use raw SQL for multi-tenant log tables
    const [auditMetrics, integrationMetrics] = await Promise.all([
      this.getAuditMetrics(prisma, tenantId, startDate, endDate),
      this.getIntegrationMetrics(prisma, startDate, endDate),
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
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReportSummary['auditMetrics']> {
    try {
      // Get tenant schema for multi-tenant queries
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { schemaName: true },
      });

      if (!tenant?.schemaName) {
        return {
          totalChangeLogEntries: 0,
          totalTechEventEntries: 0,
          totalIntegrationLogEntries: 0,
        };
      }

      const schema = tenant.schemaName;

      // Query change_log count using raw SQL
      const changeLogResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${schema}".change_log 
         WHERE occurred_at >= $1 AND occurred_at <= $2`,
        startDate,
        endDate,
      );

      // Query tech_event_log count
      const techEventResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${schema}".tech_event_log 
         WHERE created_at >= $1 AND created_at <= $2`,
        startDate,
        endDate,
      );

      // Query integration_log count (platform-level table)
      const integrationLogResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM public.integration_log 
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
         FROM public.integration_log 
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
