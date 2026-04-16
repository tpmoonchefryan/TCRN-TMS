// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildMfrFilterSummary,
  mapMfrPreviewRow,
} from '../domain/mfr-report.policy';
import {
  MfrFilterCriteriaDto,
  type MfrSearchResult,
  ReportCreateResponse,
  ReportFormat,
  ReportType,
} from '../dto/report.dto';
import { MfrReportRepository } from '../infrastructure/mfr-report.repository';
import { ReportJobService } from '../services/report-job.service';

@Injectable()
export class MfrReportApplicationService {
  constructor(
    private readonly mfrReportRepository: MfrReportRepository,
    private readonly reportJobService: ReportJobService,
  ) {}

  async search(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    previewLimit: number = 20,
    context: RequestContext,
  ): Promise<MfrSearchResult> {
    const talent = await this.mfrReportRepository.findTalent(context.tenantSchema, talentId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const [totalCount, previewRecords] = await Promise.all([
      this.mfrReportRepository.countMembershipRows(context.tenantSchema, talentId, filters),
      this.mfrReportRepository.findMembershipPreview(
        context.tenantSchema,
        talentId,
        filters,
        previewLimit,
      ),
    ]);

    return {
      totalCount,
      preview: previewRecords.map((record) => mapMfrPreviewRow(record)),
      filterSummary: buildMfrFilterSummary(filters),
    };
  }

  async createJob(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    format: ReportFormat = ReportFormat.XLSX,
    context: RequestContext,
  ): Promise<ReportCreateResponse> {
    const estimatedRows = await this.mfrReportRepository.countMembershipRows(
      context.tenantSchema,
      talentId,
      filters,
    );

    return this.reportJobService.create(
      ReportType.MFR,
      talentId,
      filters,
      format,
      estimatedRows,
      context,
    );
  }
}
