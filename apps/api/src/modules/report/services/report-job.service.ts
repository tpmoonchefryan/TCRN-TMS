// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
} from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import { ReportJobReadApplicationService } from '../application/report-job-read.service';
import { ReportJobWriteApplicationService } from '../application/report-job-write.service';
import { ReportPiiPlatformApplicationService } from '../application/report-pii-platform.service';
import {
  MfrFilterCriteriaDto,
  ReportCreateResponse,
  ReportFormat,
  ReportJobListQueryDto,
  ReportType,
} from '../dto/report.dto';
import { ReportJobReadRepository } from '../infrastructure/report-job-read.repository';
import { ReportJobWriteRepository } from '../infrastructure/report-job-write.repository';
import { ReportJobStateService } from './report-job-state.service';

@Injectable()
export class ReportJobService {
  constructor(
    databaseService: DatabaseService,
    stateService: ReportJobStateService,
    techEventLog: TechEventLogService,
    minioService: MinioService,
    reportPiiPlatformApplicationService?: ReportPiiPlatformApplicationService,
    private readonly reportJobReadApplicationService: ReportJobReadApplicationService = new ReportJobReadApplicationService(
      new ReportJobReadRepository(databaseService),
      stateService,
      techEventLog,
      minioService,
    ),
    private readonly reportJobWriteApplicationService: ReportJobWriteApplicationService = new ReportJobWriteApplicationService(
      new ReportJobWriteRepository(databaseService),
      stateService,
      techEventLog,
      reportPiiPlatformApplicationService,
    ),
  ) {}

  /**
   * Create a new report job (multi-tenant aware)
   */
  async create(
    reportType: ReportType,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    format: ReportFormat,
    estimatedRows: number,
    context: RequestContext,
  ): Promise<ReportCreateResponse> {
    return this.reportJobWriteApplicationService.create(
      reportType,
      talentId,
      filters,
      format,
      estimatedRows,
      context,
    );
  }

  /**
   * Get job by ID (multi-tenant aware)
   */
  async findById(jobId: string, talentId: string, context: RequestContext) {
    return this.reportJobReadApplicationService.findById(jobId, talentId, context);
  }

  /**
   * List jobs for talent (multi-tenant aware)
   */
  async findMany(query: ReportJobListQueryDto, context: RequestContext) {
    return this.reportJobReadApplicationService.findMany(query, context);
  }

  /**
   * Cancel a job (multi-tenant aware)
   */
  async cancel(jobId: string, talentId: string, context: RequestContext) {
    return this.reportJobWriteApplicationService.cancel(jobId, talentId, context);
  }

  /**
   * Get download URL (multi-tenant aware)
   */
  async getDownloadUrl(jobId: string, talentId: string, context: RequestContext) {
    return this.reportJobReadApplicationService.getDownloadUrl(jobId, talentId, context);
  }
}
