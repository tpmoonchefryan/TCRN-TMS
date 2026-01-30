// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request, Response } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    CreateExportJobDto,
    ExportJobQueryDto,
} from '../dto/export.dto';
import { ExportJobService } from '../services/export-job.service';

@ApiTags('Customer - Export')
@Controller('exports')
export class ExportController {
  constructor(
    private readonly exportJobService: ExportJobService,
  ) {}

  /**
   * Create export job
   */
  @Post()
  @RequirePermissions({ resource: 'customer.export', action: 'create' })
  @ApiOperation({ summary: 'Create export job' })
  @ApiResponse({ status: 201, description: 'Export job created' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async createExport(
    @Headers('x-talent-id') talentId: string,
    @Body() dto: CreateExportJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.exportJobService.createJob(talentId, dto, context);
  }

  /**
   * List export jobs
   */
  @Get()
  @RequirePermissions({ resource: 'customer.export', action: 'read' })
  @ApiOperation({ summary: 'List export jobs' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async listJobs(
    @Headers('x-talent-id') talentId: string,
    @Query() query: ExportJobQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.exportJobService.findMany(talentId, query, context);
    return {
      items: result.items,
      meta: {
        total: result.total,
      },
    };
  }

  /**
   * Get export job status
   */
  @Get(':jobId')
  @RequirePermissions({ resource: 'customer.export', action: 'read' })
  @ApiOperation({ summary: 'Get export job status' })
  async getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.exportJobService.findById(jobId, context);
  }

  /**
   * Download export file
   */
  @Get(':jobId/download')
  @RequirePermissions({ resource: 'customer.export', action: 'read' })
  @ApiOperation({ summary: 'Download export file' })
  @ApiResponse({ status: 302, description: 'Redirects to download URL' })
  async downloadExport(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const context = this.buildContext(user, req);
    const downloadUrl = await this.exportJobService.getDownloadUrl(jobId, context);
    res.redirect(downloadUrl);
  }

  /**
   * Cancel export job
   */
  @Delete(':jobId')
  @RequirePermissions({ resource: 'customer.export', action: 'delete' })
  @ApiOperation({ summary: 'Cancel export job' })
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    await this.exportJobService.cancelJob(jobId, context);
    return { message: 'Export job cancelled' };
  }

  /**
   * Build request context
   */
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
