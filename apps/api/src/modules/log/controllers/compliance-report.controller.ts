// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import { ComplianceReportService, ComplianceReportSummary } from '../services/compliance-report.service';
import {
  COMPLIANCE_REPORT_SUMMARY_SCHEMA,
  LOG_FORBIDDEN_SCHEMA,
  LOG_UNAUTHORIZED_SCHEMA,
} from './log-swagger.schemas';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('api/v1/compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceReportController {
  constructor(
    private readonly complianceReportService: ComplianceReportService,
  ) {}

  @Get('report')
  @ApiOperation({
    summary: 'Generate compliance report',
    description: 'Generate a compliance report with audit metrics for a specified period',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    description: 'Report start date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    description: 'Report end date (ISO 8601)',
    example: '2026-01-31T23:59:59Z',
  })
  @ApiResponse({ status: 200, description: 'Returns the compliance report summary', schema: COMPLIANCE_REPORT_SUMMARY_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to generate compliance reports', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to generate compliance reports', schema: LOG_FORBIDDEN_SCHEMA })
  @RequirePermissions({ resource: 'compliance.report', action: 'read' })
  async generateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ): Promise<ComplianceReportSummary> {
    const startDate = new Date(startDateStr || this.getDefaultStartDate());
    const endDate = new Date(endDateStr || new Date().toISOString());

    return this.complianceReportService.generateReport(
      user.tenantId,
      startDate,
      endDate,
    );
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString();
  }
}
