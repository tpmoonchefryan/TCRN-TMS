// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';

import type { EffectiveAdapterResolutionResult } from '../../integration/domain/adapter-resolution.policy';
import type {
  MfrFilterCriteriaDto,
  PiiPlatformReportCreateResponse,
  ReportFormat,
  ReportType,
} from '../dto/report.dto';

export const REPORT_PII_PLATFORM_CODE = 'TCRN_PII_PLATFORM';

const API_BASE_URL_CONFIG_KEYS = ['api_base_url', 'api_url', 'endpoint'];
const SERVICE_TOKEN_CONFIG_KEYS = ['service_token', 'api_key', 'access_token'];

export interface ReportPiiPlatformRuntime {
  apiBaseUrl: string;
  serviceToken: string;
  resolvedFrom: {
    ownerType: string;
    ownerId: string | null;
  };
}

export interface ReportPiiPlatformRequestPayload {
  reportType: ReportType;
  reportFormat: ReportFormat;
  talentId: string;
  customerIds: string[];
  requestMetadata: {
    estimatedRows: number;
    filters: MfrFilterCriteriaDto;
  };
  ownerScope: {
    ownerType: string;
    ownerId: string | null;
  };
  operator: {
    id: string;
    username: string;
  };
  trace: {
    requestId: string;
    tenantId: string;
  };
  deliveryMode: 'portal';
}

export const resolveReportPiiPlatformRuntime = (
  adapter: EffectiveAdapterResolutionResult | null,
): ReportPiiPlatformRuntime | null => {
  if (!adapter) {
    return null;
  }

  const apiBaseUrl = pickConfigValue(adapter, API_BASE_URL_CONFIG_KEYS);
  const serviceToken = pickConfigValue(adapter, SERVICE_TOKEN_CONFIG_KEYS);

  if (!apiBaseUrl || !serviceToken) {
    return null;
  }

  return {
    apiBaseUrl,
    serviceToken,
    resolvedFrom: {
      ownerType: adapter.resolvedFrom.ownerType,
      ownerId: adapter.resolvedFrom.ownerId,
    },
  };
};

export const buildReportPiiPlatformRequestPayload = (
  reportType: ReportType,
  talentId: string,
  customerIds: string[],
  filters: MfrFilterCriteriaDto,
  format: ReportFormat,
  estimatedRows: number,
  context: RequestContext,
  runtime: ReportPiiPlatformRuntime,
): ReportPiiPlatformRequestPayload => ({
  reportType,
  reportFormat: format,
  talentId,
  customerIds,
  requestMetadata: {
    estimatedRows,
    filters,
  },
  ownerScope: runtime.resolvedFrom,
  operator: {
    id: context.userId ?? 'unknown',
    username: context.userName ?? 'unknown',
  },
  trace: {
    requestId: context.requestId ?? 'unknown',
    tenantId: context.tenantId ?? context.tenantSchema ?? 'unknown',
  },
  deliveryMode: 'portal',
});

export const buildPiiPlatformReportCreateResponse = (
  requestId: string,
  redirectUrl: string,
  expiresAt: string,
  estimatedRows: number,
  customerCount: number,
): PiiPlatformReportCreateResponse => ({
  deliveryMode: 'pii_platform_portal',
  requestId,
  redirectUrl,
  expiresAt,
  estimatedRows,
  customerCount,
});

const pickConfigValue = (
  adapter: EffectiveAdapterResolutionResult,
  configKeys: string[],
): string | null => {
  for (const configKey of configKeys) {
    const config = adapter.configs.find((item) => item.configKey === configKey);
    const normalizedValue = normalizeConfigValue(config?.configValue);

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return null;
};

const normalizeConfigValue = (value?: string | null): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
};
