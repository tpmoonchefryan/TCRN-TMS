// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  mergeLocalizedText,
  normalizeLocalizedText,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';

import type {
  CreatePiiServiceConfigDto,
  UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';

export interface PiiServiceConfigListRow {
  id: string;
  code: string;
  name: LocalizedText;
  apiUrl: string;
  authType: string;
  isHealthy: boolean;
  lastHealthCheckAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  version: number;
}

export interface PiiServiceConfigDetailRow extends PiiServiceConfigListRow {
  description: LocalizedText;
  healthCheckUrl: string | null;
  healthCheckIntervalSec: number;
  updatedAt: Date;
}

export interface PiiServiceConfigCreatePayload {
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  apiUrl: string;
  authType: string;
  healthCheckUrl: string;
  healthCheckIntervalSec: number;
}

export interface PiiServiceConfigCreateRow {
  id: string;
  code: string;
  name: LocalizedText;
  createdAt: Date;
}

export interface PiiServiceConfigUpdateLookupRow {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  apiUrl: string;
  isActive: boolean;
  version: number;
}

export interface PiiServiceConfigUpdateRow extends PiiServiceConfigUpdateLookupRow {
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
    | 'name'
    | 'description'
    | 'apiUrl'
    | 'authType'
    | 'healthCheckUrl'
    | 'healthCheckIntervalSec'
    | 'isActive';
  value: unknown;
}

export const buildPiiServiceConfigCreatePayload = (
  dto: CreatePiiServiceConfigDto,
): PiiServiceConfigCreatePayload => ({
  code: dto.code,
  name: dto.name,
  description: normalizeLocalizedText(dto.description, dto.name.en),
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
  name: row.name,
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
  name: row.name,
  description: row.description,
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
  name: row.name,
  createdAt: row.createdAt,
});

export const buildPiiServiceConfigUpdateChanges = (
  dto: UpdatePiiServiceConfigDto,
  current: PiiServiceConfigUpdateLookupRow,
): PiiServiceConfigFieldChange[] => {
  const changes: PiiServiceConfigFieldChange[] = [];

  if (dto.name !== undefined) {
    changes.push({
      field: 'name',
      value: mergeLocalizedText(current.name, dto.name),
    });
  }

  if (dto.description !== undefined) {
    changes.push({
      field: 'description',
      value: normalizeLocalizedText(
        {
          ...current.description,
          ...(dto.description as PartialLocalizedText),
        },
        current.description.en,
      ),
    });
  }

  const scalarFields = [
    'apiUrl',
    'authType',
    'healthCheckUrl',
    'healthCheckIntervalSec',
    'isActive',
  ] as const;

  for (const field of scalarFields) {
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
    name: previous.name,
    description: previous.description,
    apiUrl: previous.apiUrl,
    isActive: previous.isActive,
  },
  newValue: {
    name: updated.name,
    description: updated.description,
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
