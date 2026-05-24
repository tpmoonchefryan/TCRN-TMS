// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable, NotFoundException } from '@nestjs/common';

import { ErrorCodes } from '@tcrn/shared';

import { findReportCatalogItem, listReportCatalogItems } from '../domain/report-catalog.policy';

@Injectable()
export class ReportCatalogApplicationService {
  list() {
    return {
      items: listReportCatalogItems(),
    };
  }

  get(reportId: string) {
    const report = findReportCatalogItem(reportId);

    if (!report) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Report catalog item not found',
      });
    }

    return report;
  }
}
