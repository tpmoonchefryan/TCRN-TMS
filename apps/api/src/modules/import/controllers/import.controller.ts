// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
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
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { Request, Response } from 'express';

import {
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import { ImportJobSubmissionApplicationService } from '../application/import-job-submission.service';
import {
    CreateImportJobDto,
    ImportJobQueryDto,
    ImportJobType,
} from '../dto/import.dto';
import { ImportJobService } from '../services/import-job.service';
import { ImportParserService, type ImportTemplateKind } from '../services/import-parser.service';

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

const IMPORT_JOB_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
    jobType: { type: 'string', example: 'individual_import' },
    status: { type: 'string', example: 'running' },
    fileName: { type: 'string', example: 'customers.csv' },
    consumerCode: { type: 'string', nullable: true, example: 'CRM' },
    progress: {
      type: 'object',
      properties: {
        totalRows: { type: 'integer', example: 200 },
        processedRows: { type: 'integer', example: 120 },
        successRows: { type: 'integer', example: 110 },
        failedRows: { type: 'integer', example: 5 },
        warningRows: { type: 'integer', example: 5 },
        percentage: { type: 'integer', example: 60 },
      },
      required: ['totalRows', 'processedRows', 'successRows', 'failedRows', 'warningRows', 'percentage'],
    },
    startedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T12:00:10.000Z' },
    completedAt: { type: 'string', nullable: true, format: 'date-time', example: null },
    estimatedRemainingSeconds: { type: 'integer', nullable: true, example: 45 },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
    createdBy: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        username: { type: 'string', example: 'operator' },
      },
      required: ['id', 'username'],
    },
  },
  required: ['id', 'jobType', 'status', 'fileName', 'consumerCode', 'progress', 'startedAt', 'completedAt', 'estimatedRemainingSeconds', 'createdAt', 'createdBy'],
};

const IMPORT_JOB_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
    status: { type: 'string', example: 'pending' },
    fileName: { type: 'string', example: 'customers.csv' },
    totalRows: { type: 'integer', example: 200 },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
  },
  required: ['id', 'status', 'fileName', 'totalRows', 'createdAt'],
};

const IMPORT_JOB_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: IMPORT_JOB_SCHEMA },
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

const IMPORT_CANCEL_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Import job cancelled' },
  },
  required: ['message'],
};

const CSV_DOWNLOAD_SCHEMA = {
  type: 'string',
  format: 'binary',
};

const IMPORT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const IMPORT_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

const IMPORT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Import job not found',
);

const IMPORT_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Import request is invalid',
);

@ApiTags('Customer - Import')
@ApiBearerAuth()
@Controller('talents/:talentId/imports/customers')
export class ImportController {
  constructor(
    private readonly importJobService: ImportJobService,
    private readonly importJobSubmissionApplicationService: ImportJobSubmissionApplicationService,
    private readonly importParserService: ImportParserService,
  ) {}

  // =========================================================================
  // Template Downloads
  // =========================================================================

  /**
   * Download individual import template
   */
  @Get('individuals/template')
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Download individual import template' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Returns the individual customer CSV template', schema: CSV_DOWNLOAD_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to download individual templates', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download individual templates', schema: IMPORT_FORBIDDEN_SCHEMA })
  async downloadIndividualTemplate(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    void talentId;
    const csv = this.importParserService.generateIndividualTemplate();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="individual_import_template.csv"',
    });

    return new StreamableFile(Buffer.from('\ufeff' + csv, 'utf-8')); // BOM for Excel
  }

  /**
   * Download company import template
   */
  @Get('companies/template')
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Download company import template' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Returns the company customer CSV template', schema: CSV_DOWNLOAD_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to download company templates', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download company templates', schema: IMPORT_FORBIDDEN_SCHEMA })
  async downloadCompanyTemplate(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    void talentId;
    const csv = this.importParserService.generateCompanyTemplate();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="company_import_template.csv"',
    });

    return new StreamableFile(Buffer.from('\ufeff' + csv, 'utf-8'));
  }

  // =========================================================================
  // Upload & Create Jobs
  // =========================================================================

  /**
   * Upload individual import CSV
   */
  @Post('individuals')
  @RequirePublishedTalentAccess()
  @RequirePermissions({ resource: 'customer.import', action: 'create' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload individual import CSV' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        consumerCode: { type: 'string', example: 'CRM' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Individual import job created', schema: IMPORT_JOB_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Individual import request is invalid', schema: IMPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to upload individual imports', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to upload individual imports', schema: IMPORT_FORBIDDEN_SCHEMA })
  async uploadIndividual(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No file uploaded',
      });
    }

    const context = this.buildContext(user, req);

    const content = file.buffer.toString('utf-8');
    const totalRows = this.validateCsvUpload(content, 'individual');

    return this.importJobSubmissionApplicationService.submitCustomerCreateJob({
      jobType: ImportJobType.INDIVIDUAL_IMPORT,
      talentId,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      fileSize: file.size,
      totalRows,
      consumerCode: dto.consumerCode,
      defaultProfileType: 'individual',
      context,
    });
  }

  /**
   * Upload company import CSV
   */
  @Post('companies')
  @RequirePublishedTalentAccess()
  @RequirePermissions({ resource: 'customer.import', action: 'create' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload company import CSV' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        consumerCode: { type: 'string', example: 'CRM' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Company import job created', schema: IMPORT_JOB_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Company import request is invalid', schema: IMPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to upload company imports', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to upload company imports', schema: IMPORT_FORBIDDEN_SCHEMA })
  async uploadCompany(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No file uploaded',
      });
    }

    const context = this.buildContext(user, req);

    const content = file.buffer.toString('utf-8');
    const totalRows = this.validateCsvUpload(content, 'company');

    return this.importJobSubmissionApplicationService.submitCustomerCreateJob({
      jobType: ImportJobType.COMPANY_IMPORT,
      talentId,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      fileSize: file.size,
      totalRows,
      consumerCode: dto.consumerCode,
      defaultProfileType: 'company',
      context,
    });
  }

  // =========================================================================
  // Job Status & Management
  // =========================================================================

  /**
   * List import jobs
   */
  @Get()
  @RequirePublishedTalentAccess()
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'List import jobs' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns import jobs', schema: IMPORT_JOB_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'Import-job query is invalid', schema: IMPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list import jobs', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list import jobs', schema: IMPORT_FORBIDDEN_SCHEMA })
  async listJobs(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: ImportJobQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.importJobService.findMany(talentId, query, context);
    return {
      items: result.items,
      meta: {
        total: result.total,
      },
    };
  }

  /**
   * Get import job status
   */
  @Get(':type/:jobId')
  @RequirePublishedTalentAccess({ jobOwnerSource: 'import' })
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Get import job status' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'type',
    description: 'Import-job type',
    schema: { type: 'string', enum: ['individual_import', 'company_import'] },
  })
  @ApiParam({
    name: 'jobId',
    description: 'Import-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns import job detail', schema: IMPORT_JOB_SCHEMA })
  @ApiResponse({ status: 400, description: 'Import-job lookup is invalid', schema: IMPORT_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read import jobs', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read import jobs', schema: IMPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Import job was not found', schema: IMPORT_NOT_FOUND_SCHEMA })
  async getJob(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    void type;
    const context = this.buildContext(user, req);
    return this.importJobService.findById(jobId, talentId, context);
  }

  /**
   * Get import job errors
   */
  @Get(':type/:jobId/errors')
  @RequirePublishedTalentAccess({ jobOwnerSource: 'import' })
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Download import job errors' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'type',
    description: 'Import-job type',
    schema: { type: 'string', enum: ['individual_import', 'company_import'] },
  })
  @ApiParam({
    name: 'jobId',
    description: 'Import-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Returns import-job errors as CSV', schema: CSV_DOWNLOAD_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to download import-job errors', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download import-job errors', schema: IMPORT_FORBIDDEN_SCHEMA })
  async getJobErrors(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    void type;
    const context = this.buildContext(user, req);
    const errors = await this.importJobService.getErrors(jobId, talentId, context);
    const csv = this.importParserService.generateErrorsCsv(errors);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="import_${jobId}_errors.csv"`,
    });

    return new StreamableFile(Buffer.from('\ufeff' + csv, 'utf-8'));
  }

  /**
   * Cancel import job
   */
  @Delete(':type/:jobId')
  @RequirePublishedTalentAccess({ jobOwnerSource: 'import' })
  @RequirePermissions({ resource: 'customer.import', action: 'delete' })
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'type',
    description: 'Import-job type',
    schema: { type: 'string', enum: ['individual_import', 'company_import'] },
  })
  @ApiParam({
    name: 'jobId',
    description: 'Import-job identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Import job cancelled', schema: IMPORT_CANCEL_SCHEMA })
  @ApiResponse({ status: 400, description: 'Import job cannot be cancelled in its current state', schema: createErrorEnvelopeSchema(ErrorCodes.VALIDATION_FAILED, 'Can only cancel pending or running jobs') })
  @ApiResponse({ status: 401, description: 'Authentication is required to cancel import jobs', schema: IMPORT_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to cancel import jobs', schema: IMPORT_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Import job was not found', schema: IMPORT_NOT_FOUND_SCHEMA })
  async cancelJob(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    void type;
    const context = this.buildContext(user, req);
    await this.importJobService.cancelJob(jobId, talentId, context);
    return { message: 'Import job cancelled' };
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
      tenantId: req.headers['x-tenant-id'] as string | undefined,
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }

  private validateCsvUpload(content: string, templateKind: ImportTemplateKind): number {
    const validation = this.importParserService.validateCsvTemplate(content, templateKind);

    if (!validation.success) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'CSV headers do not match the current import template',
        details: {
          fields: validation.errors,
        },
      });
    }

    return validation.totalRows;
  }
}
