// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { REPORT_CATALOG, type ReportCatalogItem, type ReportType } from '@tcrn/shared';

export const listReportCatalogItems = (): ReportCatalogItem[] => REPORT_CATALOG;

export const findReportCatalogItem = (reportId: string): ReportCatalogItem | null =>
  REPORT_CATALOG.find((item) => item.id === (reportId as ReportType)) ?? null;
