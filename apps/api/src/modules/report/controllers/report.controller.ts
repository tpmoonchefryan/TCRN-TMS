// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request, Response } from 'express';

import { RequirePermissions, CurrentUser } from '../../../common/decorators';
import {
  MfrSearchRequestDto,
  CreateMfrJobDto,
  ReportJobListQueryDto,
} from '../dto/report.dto';
import { MfrReportService } from '../services/mfr-report.service';
import { ReportJobService } from '../services/report-job.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportJobService: ReportJobService,
    private readonly mfrReportService: MfrReportService,
  ) {}

  // =========================================================================
  // MFR Report
  // =========================================================================

  @Post('mfr/search')
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'Search and preview MFR data' })
  async searchMfr(
    @Body() dto: MfrSearchRequestDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.mfrReportService.search(
      dto.talentId,
      dto.filters,
      dto.previewLimit,
      context,
    );
  }

  @Post('mfr/jobs')
  @RequirePermissions({ resource: 'report.mfr', action: 'export' })
  @ApiOperation({ summary: 'Create MFR export job' })
  async createMfrJob(
    @Body() dto: CreateMfrJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.mfrReportService.createJob(
      dto.talentId,
      dto.filters,
      dto.format,
      context,
    );
  }

  @Get('mfr/jobs')
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'List MFR jobs' })
  async listMfrJobs(
    @Query() query: ReportJobListQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.reportJobService.findMany(query, context);
    return {
      items: result.items,
      meta: {
        total: result.total,
      },
    };
  }

  @Get('mfr/jobs/:jobId')
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'Get MFR job status' })
  async getMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.reportJobService.findById(jobId, talentId, context);
  }

  @Get('mfr/jobs/:jobId/download')
  @RequirePermissions({ resource: 'report.mfr', action: 'export' })
  @ApiOperation({ summary: 'Download MFR report' })
  async downloadMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.reportJobService.getDownloadUrl(jobId, talentId, context);

    // Option 1: Return JSON with URL
    return result;

    // Option 2: Redirect to presigned URL (uncomment if preferred)
    // res.redirect(302, result.downloadUrl);
  }

  @Delete('mfr/jobs/:jobId')
  @RequirePermissions({ resource: 'report.mfr', action: 'admin' })
  @ApiOperation({ summary: 'Cancel MFR job' })
  async cancelMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.reportJobService.cancel(jobId, talentId, context);
  }

  private buildContext(
    user: { id: string; username: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
