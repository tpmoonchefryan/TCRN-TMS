// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { MfrReportApplicationService } from '../application/mfr-report.service';
import {
  MfrFilterCriteriaDto,
  MfrSearchResult,
  ReportCreateResponse,
  ReportFormat,
} from '../dto/report.dto';
import { MfrReportRepository } from '../infrastructure/mfr-report.repository';
import { ReportJobService } from './report-job.service';

@Injectable()
export class MfrReportService {
  constructor(
    databaseService: DatabaseService,
    reportJobService: ReportJobService,
    private readonly mfrReportApplicationService: MfrReportApplicationService = new MfrReportApplicationService(
      new MfrReportRepository(databaseService),
      reportJobService,
    ),
  ) {}

  async search(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    previewLimit: number = 20,
    context: RequestContext,
  ): Promise<MfrSearchResult> {
    return this.mfrReportApplicationService.search(
      talentId,
      filters,
      previewLimit,
      context,
    );
  }

  async createJob(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    format: ReportFormat = ReportFormat.XLSX,
    context: RequestContext,
  ): Promise<ReportCreateResponse> {
    return this.mfrReportApplicationService.createJob(
      talentId,
      filters,
      format,
      context,
    );
  }
}
