// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  CreatePiiServiceConfigDto,
  UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';

export interface PiiServiceConfigListRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  apiUrl: string;
  authType: string;
  isHealthy: boolean;
  lastHealthCheckAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  version: number;
}

export interface PiiServiceConfigDetailRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  apiUrl: string;
  authType: string;
  healthCheckUrl: string | null;
  healthCheckIntervalSec: number;
  isHealthy: boolean;
  lastHealthCheckAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PiiServiceConfigCreateRow {
  id: string;
  code: string;
  nameEn: string;
  createdAt: Date;
}

export interface PiiServiceConfigUpdateLookupRow {
  id: string;
  code: string;
  nameEn: string;
  apiUrl: string;
  isActive: boolean;
  version: number;
}

export interface PiiServiceConfigUpdateRow {
  id: string;
  code: string;
  nameEn: string;
  apiUrl: string;
  isActive: boolean;
  version: number;
  updatedAt: Date;
}

export interface PiiServiceConfigConnectionLookupRow {
  id: string;
  apiUrl: string;
  healthCheckUrl: string | null;
}

export interface PiiServiceHealthCheckResult {
  status: string;
  latencyMs: number;
}

export interface PiiServiceConfigFieldChange {
  field:
    | 'nameEn'
    | 'nameZh'
    | 'nameJa'
    | 'descriptionEn'
    | 'descriptionZh'
    | 'descriptionJa'
    | 'apiUrl'
    | 'authType'
    | 'healthCheckUrl'
    | 'healthCheckIntervalSec'
    | 'isActive';
  value: unknown;
}

export const buildPiiServiceConfigCreatePayload = (
  dto: CreatePiiServiceConfigDto,
) => ({
  code: dto.code,
  nameEn: dto.nameEn,
  nameZh: dto.nameZh ?? null,
  nameJa: dto.nameJa ?? null,
  descriptionEn: dto.descriptionEn ?? null,
  descriptionZh: dto.descriptionZh ?? null,
  descriptionJa: dto.descriptionJa ?? null,
  apiUrl: dto.apiUrl,
  authType: dto.authType,
  healthCheckUrl: dto.healthCheckUrl ?? `${dto.apiUrl}/health`,
  healthCheckIntervalSec: dto.healthCheckIntervalSec ?? 60,
});

export const buildPiiServiceConfigListItem = (
  row: PiiServiceConfigListRow,
  profileStoreCount: number,
) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  nameZh: row.nameZh,
  nameJa: row.nameJa,
  apiUrl: row.apiUrl,
  authType: row.authType,
  isHealthy: row.isHealthy,
  lastHealthCheckAt: row.lastHealthCheckAt,
  isActive: row.isActive,
  profileStoreCount,
  createdAt: row.createdAt,
  version: row.version,
});

export const buildPiiServiceConfigDetailResponse = (
  row: PiiServiceConfigDetailRow,
  profileStoreCount: number,
) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  nameZh: row.nameZh,
  nameJa: row.nameJa,
  description: row.descriptionEn,
  descriptionZh: row.descriptionZh,
  descriptionJa: row.descriptionJa,
  apiUrl: row.apiUrl,
  authType: row.authType,
  healthCheckUrl: row.healthCheckUrl,
  healthCheckIntervalSec: row.healthCheckIntervalSec,
  isHealthy: row.isHealthy,
  lastHealthCheckAt: row.lastHealthCheckAt,
  isActive: row.isActive,
  profileStoreCount,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  version: row.version,
});

export const buildPiiServiceConfigCreateResponse = (
  row: PiiServiceConfigCreateRow,
) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  createdAt: row.createdAt,
});

export const buildPiiServiceConfigUpdateChanges = (
  dto: UpdatePiiServiceConfigDto,
): PiiServiceConfigFieldChange[] => {
  const changes: PiiServiceConfigFieldChange[] = [];

  const fields = [
    'nameEn',
    'nameZh',
    'nameJa',
    'descriptionEn',
    'descriptionZh',
    'descriptionJa',
    'apiUrl',
    'authType',
    'healthCheckUrl',
    'healthCheckIntervalSec',
    'isActive',
  ] as const;

  for (const field of fields) {
    const value = dto[field];
    if (value !== undefined) {
      changes.push({ field, value });
    }
  }

  return changes;
};

export const buildPiiServiceConfigUpdateAudit = (
  previous: PiiServiceConfigUpdateLookupRow,
  updated: PiiServiceConfigUpdateRow,
) => ({
  oldValue: {
    nameEn: previous.nameEn,
    apiUrl: previous.apiUrl,
    isActive: previous.isActive,
  },
  newValue: {
    nameEn: updated.nameEn,
    apiUrl: updated.apiUrl,
    isActive: updated.isActive,
  },
});

export const buildPiiServiceConfigUpdateResponse = (
  row: PiiServiceConfigUpdateRow,
) => ({
  id: row.id,
  code: row.code,
  version: row.version,
  updatedAt: row.updatedAt,
});

export const buildPiiServiceHealthBaseUrl = (
  row: Pick<PiiServiceConfigConnectionLookupRow, 'apiUrl' | 'healthCheckUrl'>,
): string => {
  const healthUrl = row.healthCheckUrl ?? `${row.apiUrl}/health`;
  return healthUrl.replace(/\/health$/, '');
};

export const buildPiiServiceHealthCheckResponse = (
  result: PiiServiceHealthCheckResult,
  testedAt = new Date(),
) => ({
  status: result.status,
  latencyMs: result.latencyMs,
  testedAt,
});
