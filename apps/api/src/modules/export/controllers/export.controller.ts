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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { ErrorCodes } from '@tcrn/shared';
import { Request, Response } from 'express';

import {
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import {
    CreateExportJobDto,
    ExportJobQueryDto,
} from '../dto/export.dto';
import { ExportJobService } from '../services/export-job.service';

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const EXPORT_JOB_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440800' },
    jobType: { type: 'string', example: 'customer_export' },
    format: { type: 'string', example: 'csv' },
    status: { type: 'string', example: 'pending' },
    fileName: { type: 'string', nullable: true, example: 'customers-20260413.csv' },
    totalRecords: { type: 'integer', example: 1200 },
    processedRecords: { type: 'integer', example: 0 },
    downloadUrl: { type: 'string', nullable: true, example: '/api/v1/exports/550e8400-e29b-41d4-a716-446655440800/download' },
    expiresAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T11:05:00.000Z' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T11:00:00.000Z' },
    completedAt: { type: 'string', nullable: true, format: 'date-time', example: null },
  },
  required: ['id', 'jobType', 'format', 'status', 'fileName', 'totalRecords', 'processedRecords', 'downloadUrl', 'expiresAt', 'createdAt', 'completedAt'],
};

const EXPORT_JOB_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: EXPORT_JOB_SCHEMA },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 1 },
      },
      required: ['total'],
    },
  },
  required: ['items', 'meta'],
};

const EXPORT_CANCEL_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Export job cancelled' },
  },
  required: ['message'],
};

const EXPORT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const EXPORT_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

const EXPORT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Export job not found',
);

const EXPORT_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Export request is invalid',
);

@ApiTags('Customer - Export')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
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
  @ApiResponse({ status: 201, description: 'Export job created', schema: EXPORT_JOB_SCHEMA })
  @ApiResponse({ status: 400, description: 'Export request is invalid', schema: EXPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create export jobs', schema: EXPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create export jobs', schema: EXPORT_FORBIDDEN_SCHEMA })
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
  @ApiResponse({ status: 200, description: 'Returns export jobs', schema: EXPORT_JOB_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list export jobs', schema: EXPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list export jobs', schema: EXPORT_FORBIDDEN_SCHEMA })
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
  @RequirePublishedTalentAccess({ jobOwnerSource: 'export' })
  @RequirePermissions({ resource: 'customer.export', action: 'read' })
  @ApiOperation({ summary: 'Get export job status' })
  @ApiParam({
    name: 'jobId',
    description: 'Export-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns export job detail', schema: EXPORT_JOB_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read export jobs', schema: EXPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read export jobs', schema: EXPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Export job was not found', schema: EXPORT_NOT_FOUND_SCHEMA })
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
  @RequirePublishedTalentAccess({ jobOwnerSource: 'export' })
  @RequirePermissions({ resource: 'customer.export', action: 'read' })
  @ApiOperation({ summary: 'Download export file' })
  @ApiParam({
    name: 'jobId',
    description: 'Export-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 302, description: 'Redirects to the export download URL', content: {} })
  @ApiResponse({ status: 400, description: 'Export file is not ready for download', schema: createErrorEnvelopeSchema(ErrorCodes.VALIDATION_FAILED, 'Export not ready for download') })
  @ApiResponse({ status: 401, description: 'Authentication is required to download export files', schema: EXPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download export files', schema: EXPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Export job was not found', schema: EXPORT_NOT_FOUND_SCHEMA })
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
  @RequirePublishedTalentAccess({ jobOwnerSource: 'export' })
  @RequirePermissions({ resource: 'customer.export', action: 'delete' })
  @ApiOperation({ summary: 'Cancel export job' })
  @ApiParam({
    name: 'jobId',
    description: 'Export-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Export job cancelled', schema: EXPORT_CANCEL_SCHEMA })
  @ApiResponse({ status: 400, description: 'Export job cannot be cancelled in its current state', schema: EXPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to cancel export jobs', schema: EXPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to cancel export jobs', schema: EXPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Export job was not found', schema: EXPORT_NOT_FOUND_SCHEMA })
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
