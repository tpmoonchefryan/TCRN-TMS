// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { ErrorCodes } from '@tcrn/shared';
import { Request, Response } from 'express';

import {
    AuthenticatedUser,
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import {
    CreateMfrJobDto,
    MfrSearchRequestDto,
    ReportJobListQueryDto,
} from '../dto/report.dto';
import { MfrReportService } from '../services/mfr-report.service';
import { ReportJobService } from '../services/report-job.service';

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

const MFR_SEARCH_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    totalCount: { type: 'integer', example: 348 },
    preview: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nickname: { type: 'string', nullable: true, example: 'Aki' },
          platformName: { type: 'string', example: 'YouTube' },
          membershipLevelName: { type: 'string', example: 'Gold' },
          validFrom: { type: 'string', example: '2026-01-01' },
          validTo: { type: 'string', nullable: true, example: '2026-12-31' },
          statusName: { type: 'string', example: 'Active' },
        },
        required: ['nickname', 'platformName', 'membershipLevelName', 'validFrom', 'validTo', 'statusName'],
      },
    },
    filterSummary: {
      type: 'object',
      properties: {
        platforms: { type: 'array', items: { type: 'string' }, example: ['youtube'] },
        dateRange: { type: 'string', nullable: true, example: '2026-01-01 ~ 2026-03-31' },
        includeExpired: { type: 'boolean', example: false },
      },
      required: ['platforms', 'dateRange', 'includeExpired'],
    },
  },
  required: ['totalCount', 'preview', 'filterSummary'],
};

const MFR_JOB_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    deliveryMode: { type: 'string', example: 'tms_job' },
    jobId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440901' },
    status: { type: 'string', example: 'pending' },
    estimatedRows: { type: 'integer', example: 348 },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
  },
  required: ['deliveryMode', 'jobId', 'status', 'estimatedRows', 'createdAt'],
};

const MFR_PII_PLATFORM_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    deliveryMode: { type: 'string', example: 'pii_platform_portal' },
    requestId: { type: 'string', example: 'report-request-123' },
    redirectUrl: {
      type: 'string',
      example: 'https://pii-platform.example.com/portal/report-requests/report-request-123',
    },
    expiresAt: { type: 'string', format: 'date-time', example: '2026-04-15T02:00:00.000Z' },
    estimatedRows: { type: 'integer', example: 348 },
    customerCount: { type: 'integer', example: 217 },
  },
  required: ['deliveryMode', 'requestId', 'redirectUrl', 'expiresAt', 'estimatedRows', 'customerCount'],
};

const MFR_CREATE_RESPONSE_SCHEMA = {
  oneOf: [MFR_JOB_CREATE_SCHEMA, MFR_PII_PLATFORM_REQUEST_SCHEMA],
};

const MFR_JOB_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440901' },
    reportType: { type: 'string', example: 'mfr' },
    status: { type: 'string', example: 'success' },
    totalRows: { type: 'integer', nullable: true, example: 348 },
    fileName: { type: 'string', nullable: true, example: 'MFR_TCRN_AKI_20260413.xlsx' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    completedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:02:00.000Z' },
    expiresAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:07:00.000Z' },
  },
  required: ['id', 'reportType', 'status', 'totalRows', 'fileName', 'createdAt', 'completedAt', 'expiresAt'],
};

const MFR_JOB_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: MFR_JOB_LIST_ITEM_SCHEMA },
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

const MFR_JOB_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440901' },
    reportType: { type: 'string', example: 'mfr' },
    status: { type: 'string', example: 'success' },
    progress: {
      type: 'object',
      properties: {
        totalRows: { type: 'integer', nullable: true, example: 348 },
        processedRows: { type: 'integer', example: 348 },
        percentage: { type: 'integer', example: 100 },
      },
      required: ['totalRows', 'processedRows', 'percentage'],
    },
    error: {
      type: 'object',
      nullable: true,
      properties: {
        code: { type: 'string', example: ErrorCodes.VALIDATION_FAILED },
        message: { type: 'string', example: 'Report cannot exceed 50,000 rows' },
      },
      required: ['code', 'message'],
    },
    fileName: { type: 'string', nullable: true, example: 'MFR_TCRN_AKI_20260413.xlsx' },
    fileSizeBytes: { type: 'integer', nullable: true, example: 524288 },
    queuedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    startedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:00:10.000Z' },
    completedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:02:00.000Z' },
    expiresAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T10:07:00.000Z' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    createdBy: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        username: { type: 'string', example: 'operator' },
      },
      required: ['id', 'username'],
    },
  },
  required: ['id', 'reportType', 'status', 'progress', 'fileName', 'fileSizeBytes', 'queuedAt', 'startedAt', 'completedAt', 'expiresAt', 'createdAt', 'createdBy'],
};

const MFR_JOB_DOWNLOAD_SCHEMA = {
  type: 'object',
  properties: {
    downloadUrl: { type: 'string', example: 'https://minio.example.com/presigned/report.xlsx' },
    expiresIn: { type: 'integer', example: 300 },
    fileName: { type: 'string', nullable: true, example: 'MFR_TCRN_AKI_20260413.xlsx' },
  },
  required: ['downloadUrl', 'expiresIn', 'fileName'],
};

const MFR_JOB_CANCEL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440901' },
    status: { type: 'string', example: 'cancelled' },
  },
  required: ['id', 'status'],
};

const REPORT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const REPORT_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

const REPORT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Report job not found',
);

const REPORT_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Report request is invalid',
);

@ApiTags('Ops - Reports')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
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
  @ApiResponse({ status: 200, description: 'Returns MFR search preview data', schema: MFR_SEARCH_RESULT_SCHEMA })
  @ApiResponse({ status: 400, description: 'MFR search payload is invalid', schema: REPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to search MFR data', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to search MFR data', schema: REPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or report source data was not found', schema: createErrorEnvelopeSchema(ErrorCodes.RES_NOT_FOUND, 'Talent not found') })
  async searchMfr(
    @Body() dto: MfrSearchRequestDto,
    @CurrentUser() user: AuthenticatedUser,
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
  @ApiResponse({ status: 201, description: 'MFR export job created or handed off to TCRN PII Platform', schema: MFR_CREATE_RESPONSE_SCHEMA })
  @ApiResponse({ status: 400, description: 'MFR export request is invalid', schema: REPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create MFR export jobs', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create MFR export jobs', schema: REPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent was not found', schema: createErrorEnvelopeSchema(ErrorCodes.RES_NOT_FOUND, 'Talent not found or has no profile store') })
  async createMfrJob(
    @Body() dto: CreateMfrJobDto,
    @CurrentUser() user: AuthenticatedUser,
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
  @ApiResponse({ status: 200, description: 'Returns paginated MFR jobs', schema: MFR_JOB_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'MFR job query is invalid', schema: REPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list MFR jobs', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list MFR jobs', schema: REPORT_FORBIDDEN_SCHEMA })
  async listMfrJobs(
    @Query() query: ReportJobListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
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
  @RequirePublishedTalentAccess({ jobOwnerSource: 'report' })
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'Get MFR job status' })
  @ApiParam({
    name: 'jobId',
    description: 'Report-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'talent_id',
    required: true,
    description: 'Talent identifier for the job owner lookup',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns MFR job detail', schema: MFR_JOB_DETAIL_SCHEMA })
  @ApiResponse({ status: 400, description: 'MFR job lookup query is invalid', schema: REPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read MFR jobs', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read MFR jobs', schema: REPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'MFR job was not found', schema: REPORT_NOT_FOUND_SCHEMA })
  async getMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.reportJobService.findById(jobId, talentId, context);
  }

  @Get('mfr/jobs/:jobId/download')
  @RequirePublishedTalentAccess({ jobOwnerSource: 'report' })
  @RequirePermissions({ resource: 'report.mfr', action: 'export' })
  @ApiOperation({ summary: 'Download MFR report' })
  @ApiParam({
    name: 'jobId',
    description: 'Report-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'talent_id',
    required: true,
    description: 'Talent identifier for the job owner lookup',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns MFR report download URL', schema: MFR_JOB_DOWNLOAD_SCHEMA })
  @ApiResponse({ status: 400, description: 'Report download is not currently available', schema: createErrorEnvelopeSchema(ErrorCodes.VALIDATION_FAILED, 'Report is not available for download') })
  @ApiResponse({ status: 401, description: 'Authentication is required to download MFR reports', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download MFR reports', schema: REPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'MFR job was not found', schema: REPORT_NOT_FOUND_SCHEMA })
  async downloadMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.reportJobService.getDownloadUrl(jobId, talentId, context);

    // Option 1: Return JSON with URL
    return result;

    // Option 2: Redirect to presigned URL (uncomment if preferred)
    // res.redirect(302, result.downloadUrl);
  }

  @Delete('mfr/jobs/:jobId')
  @RequirePublishedTalentAccess({ jobOwnerSource: 'report' })
  @RequirePermissions({ resource: 'report.mfr', action: 'admin' })
  @ApiOperation({ summary: 'Cancel MFR job' })
  @ApiParam({
    name: 'jobId',
    description: 'Report-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'talent_id',
    required: true,
    description: 'Talent identifier for the job owner lookup',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'MFR job cancelled', schema: MFR_JOB_CANCEL_SCHEMA })
  @ApiResponse({ status: 400, description: 'MFR job cannot be cancelled in its current state', schema: createErrorEnvelopeSchema(ErrorCodes.VALIDATION_FAILED, 'Can only cancel pending or failed jobs') })
  @ApiResponse({ status: 401, description: 'Authentication is required to cancel MFR jobs', schema: REPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to cancel MFR jobs', schema: REPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'MFR job was not found', schema: REPORT_NOT_FOUND_SCHEMA })
  async cancelMfrJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('talent_id', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.reportJobService.cancel(jobId, talentId, context);
  }

  private buildContext(
    user: AuthenticatedUser,
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
