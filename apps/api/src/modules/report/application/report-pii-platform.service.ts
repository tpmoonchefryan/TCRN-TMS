// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCodes,
  LogSeverity,
  type RequestContext,
  TechEventType,
} from '@tcrn/shared';

import { OwnerType } from '../../integration/dto/integration.dto';
import { AdapterResolutionService } from '../../integration/services/adapter-resolution.service';
import { TechEventLogService } from '../../log';
import { PiiClientService } from '../../pii';
import {
  buildPiiPlatformReportCreateResponse,
  buildReportPiiPlatformRequestPayload,
  REPORT_PII_PLATFORM_CODE,
  resolveReportPiiPlatformRuntime,
} from '../domain/report-pii-platform.policy';
import type {
  MfrFilterCriteriaDto,
  PiiPlatformReportCreateResponse,
  ReportFormat,
  ReportType,
} from '../dto/report.dto';
import { MfrReportRepository } from '../infrastructure/mfr-report.repository';

@Injectable()
export class ReportPiiPlatformApplicationService {
  constructor(
    private readonly mfrReportRepository: MfrReportRepository,
    private readonly adapterResolutionService: AdapterResolutionService,
    private readonly piiClientService: PiiClientService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  async createMfrReportRequest(
    reportType: ReportType,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    format: ReportFormat,
    estimatedRows: number,
    context: RequestContext,
  ): Promise<PiiPlatformReportCreateResponse | null> {
    const adapter = await this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TALENT,
        ownerId: talentId,
        platformCode: REPORT_PII_PLATFORM_CODE,
      },
      context,
    );

    if (!adapter) {
      return null;
    }

    const runtime = resolveReportPiiPlatformRuntime(adapter);

    if (!runtime) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'TCRN PII Platform adapter is missing report runtime configuration',
      });
    }

    const talent = await this.mfrReportRepository.findTalent(
      context.tenantSchema ?? 'public',
      talentId,
    );

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const customerIds = await this.mfrReportRepository.findMatchingCustomerIds(
      context.tenantSchema ?? 'public',
      talentId,
      filters,
    );

    const result = await this.piiClientService.createReportRequest(
      runtime.apiBaseUrl,
      buildReportPiiPlatformRequestPayload(
        reportType,
        talentId,
        customerIds,
        filters,
        format,
        estimatedRows,
        context,
        runtime,
      ),
      runtime.serviceToken,
      context.tenantId ?? context.tenantSchema ?? 'unknown',
      context.tenantSchema,
    );

    await this.techEventLog.log(
      {
        eventType: TechEventType.SYSTEM_INFO,
        scope: 'export',
        severity: LogSeverity.INFO,
        traceId: result.requestId,
        payload: {
          action: 'pii_platform_report_request_created',
          requestId: result.requestId,
          reportType,
          talentId,
          estimatedRows,
          customerCount: customerIds.length,
          deliveryMode: 'portal',
          ownerScope: runtime.resolvedFrom,
        },
      },
      context,
    );

    return buildPiiPlatformReportCreateResponse(
      result.requestId,
      result.redirectUrl,
      result.expiresAt,
      estimatedRows,
      customerIds.length,
    );
  }
}
