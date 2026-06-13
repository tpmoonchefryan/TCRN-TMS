// SPDX-License-Identifier: Apache-2.0
import { pickLocalizedText, type LocalizedText } from '@tcrn/shared';

import type { MfrFilterCriteriaDto, MfrPreviewRow, MfrSearchResult } from '../dto/report.dto';

export interface RawMfrPreviewRecord {
  nickname: string | null;
  platform_display_name: string | null;
  level_name: LocalizedText | null;
  valid_from: Date;
  valid_to: Date | null;
  status_name: LocalizedText | null;
}

const formatDateOnly = (value: Date): string => value.toISOString().split('T')[0];

export const mapMfrPreviewRow = (record: RawMfrPreviewRecord): MfrPreviewRow => ({
  nickname: record.nickname,
  platformName: record.platform_display_name ?? '',
  membershipLevelName: record.level_name ? pickLocalizedText(record.level_name, 'zh_HANS') : '',
  validFrom: formatDateOnly(record.valid_from),
  validTo: record.valid_to ? formatDateOnly(record.valid_to) : null,
  statusName: record.status_name ? pickLocalizedText(record.status_name, 'zh_HANS') : '',
});

export const buildMfrFilterSummary = (
  filters: MfrFilterCriteriaDto
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
