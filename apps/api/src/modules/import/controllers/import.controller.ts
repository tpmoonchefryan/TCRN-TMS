// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  Req,
  Res,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import type { Queue } from 'bullmq';
import { Request, Response } from 'express';

import { RequirePermissions, CurrentUser } from '../../../common/decorators';
import { MinioService } from '../../minio';
import { QUEUE_NAMES } from '../../queue';
import {
  ImportJobType,
  CreateImportJobDto,
  ImportJobQueryDto,
} from '../dto/import.dto';
import { ImportJobService } from '../services/import-job.service';
import { ImportParserService } from '../services/import-parser.service';

@ApiTags('Customer Import')
@Controller('imports/customers')
export class ImportController {
  constructor(
    private readonly importJobService: ImportJobService,
    private readonly importParserService: ImportParserService,
    private readonly minioService: MinioService,
    @InjectQueue(QUEUE_NAMES.IMPORT) private readonly importQueue: Queue,
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
  async downloadIndividualTemplate(@Res({ passthrough: true }) res: Response) {
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
  async downloadCompanyTemplate(@Res({ passthrough: true }) res: Response) {
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
  @RequirePermissions({ resource: 'customer.import', action: 'create' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload individual import CSV' })
  @ApiResponse({ status: 201, description: 'Import job created' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async uploadIndividual(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }

    const context = this.buildContext(user, req);

    // Count rows (simple newline count for estimation)
    const content = file.buffer.toString('utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const totalRows = Math.max(0, lines.length - 1); // Exclude header

    // Create job
    const job = await this.importJobService.createJob(
      ImportJobType.INDIVIDUAL_IMPORT,
      talentId,
      file.originalname,
      file.size,
      totalRows,
      dto.consumerCode,
      context,
    );

    // Save file to MinIO
    const objectName = `${job.id}.csv`;
    await this.minioService.uploadFile('imports', objectName, file.buffer, 'text/csv');

    // Queue for processing
    await this.importQueue.add('process-import', {
      jobId: job.id,
      jobType: 'customer_create',
      filePath: objectName,
      talentId,
    });

    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      totalRows,
      createdAt: job.createdAt,
    };
  }

  /**
   * Upload company import CSV
   */
  @Post('companies')
  @RequirePermissions({ resource: 'customer.import', action: 'create' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload company import CSV' })
  @ApiResponse({ status: 201, description: 'Import job created' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async uploadCompany(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }

    const context = this.buildContext(user, req);

    const content = file.buffer.toString('utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const totalRows = Math.max(0, lines.length - 1);

    const job = await this.importJobService.createJob(
      ImportJobType.COMPANY_IMPORT,
      talentId,
      file.originalname,
      file.size,
      totalRows,
      dto.consumerCode,
      context,
    );

    // Save file to MinIO
    const objectName = `${job.id}.csv`;
    await this.minioService.uploadFile('imports', objectName, file.buffer, 'text/csv');

    // Queue for processing
    await this.importQueue.add('process-import', {
      jobId: job.id,
      jobType: 'customer_create',
      filePath: objectName,
      talentId,
    });

    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      totalRows,
      createdAt: job.createdAt,
    };
  }

  // =========================================================================
  // Job Status & Management
  // =========================================================================

  /**
   * List import jobs
   */
  @Get()
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'List import jobs' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async listJobs(
    @Headers('x-talent-id') talentId: string,
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
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Get import job status' })
  async getJob(
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.importJobService.findById(jobId, context);
  }

  /**
   * Get import job errors
   */
  @Get(':type/:jobId/errors')
  @RequirePermissions({ resource: 'customer.import', action: 'read' })
  @ApiOperation({ summary: 'Download import job errors' })
  async getJobErrors(
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.buildContext(user, req);
    const errors = await this.importJobService.getErrors(jobId, context);
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
  @RequirePermissions({ resource: 'customer.import', action: 'delete' })
  @ApiOperation({ summary: 'Cancel import job' })
  async cancelJob(
    @Param('type') type: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    await this.importJobService.cancelJob(jobId, context);
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
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
