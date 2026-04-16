// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  MfrFilterCriteriaDto,
  MfrPreviewRow,
  MfrSearchResult,
} from '../dto/report.dto';

export interface RawMfrPreviewRecord {
  nickname: string | null;
  platform_display_name: string | null;
  level_name_zh: string | null;
  level_name_en: string | null;
  valid_from: Date;
  valid_to: Date | null;
  status_name_zh: string | null;
  status_name_en: string | null;
}

const formatDateOnly = (value: Date): string => value.toISOString().split('T')[0];

export const mapMfrPreviewRow = (record: RawMfrPreviewRecord): MfrPreviewRow => ({
  nickname: record.nickname,
  platformName: record.platform_display_name ?? '',
  membershipLevelName: record.level_name_zh ?? record.level_name_en ?? '',
  validFrom: formatDateOnly(record.valid_from),
  validTo: record.valid_to ? formatDateOnly(record.valid_to) : null,
  statusName: record.status_name_zh ?? record.status_name_en ?? '',
});

export const buildMfrFilterSummary = (
  filters: MfrFilterCriteriaDto,
): MfrSearchResult['filterSummary'] => {
  let dateRange: string | null = null;
  if (filters.validFromStart || filters.validFromEnd) {
    dateRange = `${filters.validFromStart ?? '...'} ~ ${filters.validFromEnd ?? '...'}`;
  }

  return {
    platforms: filters.platformCodes ?? [],
    dateRange,
    includeExpired: filters.includeExpired ?? false,
  };
};
