// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';

import type { EffectiveAdapterResolutionResult } from '../../integration/domain/adapter-resolution.policy';
import type {
  CompanyPiiDataDto,
  PiiDataDto,
  ProfileType,
} from '../dto/customer.dto';

export const PII_PLATFORM_CODE = 'TCRN_PII_PLATFORM';

const API_BASE_URL_CONFIG_KEYS = ['api_base_url', 'api_url', 'endpoint'];
const SERVICE_TOKEN_CONFIG_KEYS = ['service_token', 'api_key', 'access_token'];

export interface CustomerPiiPlatformRuntime {
  apiBaseUrl: string;
  serviceToken: string;
  resolvedFrom: {
    ownerType: string;
    ownerId: string | null;
  };
}

export interface CustomerPiiPlatformWritePayload {
  customerId: string;
  talentId: string;
  profileType: ProfileType;
  pii: PiiDataDto | CompanyPiiDataDto;
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
}

export interface CustomerPiiPlatformPortalSessionPayload {
  customerId: string;
  talentId: string;
  profileType: ProfileType;
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
  purpose: 'customer_view';
}

export interface CustomerPiiPlatformLifecyclePayload {
  customerId: string;
  talentId: string;
  profileType: ProfileType;
  lifecycle: {
    action: 'deactivate' | 'reactivate';
    isActive: boolean;
    reasonCode: string | null;
    occurredAt: string;
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
}

export const resolveCustomerPiiPlatformRuntime = (
  adapter: EffectiveAdapterResolutionResult | null,
): CustomerPiiPlatformRuntime | null => {
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

export const buildCustomerPiiPlatformWritePayload = (
  customerId: string,
  talentId: string,
  profileType: ProfileType,
  pii: PiiDataDto | CompanyPiiDataDto,
  context: RequestContext,
  runtime: CustomerPiiPlatformRuntime,
): CustomerPiiPlatformWritePayload => ({
  customerId,
  talentId,
  profileType,
  pii,
  ownerScope: runtime.resolvedFrom,
  operator: {
    id: context.userId,
    username: context.userName,
  },
  trace: {
    requestId: context.requestId,
    tenantId: context.tenantId,
  },
});

export const buildCustomerPiiPlatformPortalSessionPayload = (
  customerId: string,
  talentId: string,
  profileType: ProfileType,
  context: RequestContext,
  runtime: CustomerPiiPlatformRuntime,
): CustomerPiiPlatformPortalSessionPayload => ({
  customerId,
  talentId,
  profileType,
  ownerScope: runtime.resolvedFrom,
  operator: {
    id: context.userId,
    username: context.userName,
  },
  trace: {
    requestId: context.requestId,
    tenantId: context.tenantId,
  },
  purpose: 'customer_view',
});

export const buildCustomerPiiPlatformLifecyclePayload = (
  customerId: string,
  talentId: string,
  profileType: ProfileType,
  lifecycle: {
    action: 'deactivate' | 'reactivate';
    isActive: boolean;
    reasonCode?: string | null;
    occurredAt: Date;
  },
  context: RequestContext,
  runtime: CustomerPiiPlatformRuntime,
): CustomerPiiPlatformLifecyclePayload => ({
  customerId,
  talentId,
  profileType,
  lifecycle: {
    action: lifecycle.action,
    isActive: lifecycle.isActive,
    reasonCode: lifecycle.reasonCode ?? null,
    occurredAt: lifecycle.occurredAt.toISOString(),
  },
  ownerScope: runtime.resolvedFrom,
  operator: {
    id: context.userId,
    username: context.userName,
  },
  trace: {
    requestId: context.requestId,
    tenantId: context.tenantId,
  },
});

export const buildCustomerPiiPortalSessionResult = (result: {
  redirectUrl: string;
  expiresAt: string;
}) => ({
  redirectUrl: result.redirectUrl,
  expiresAt: result.expiresAt,
});

export const buildCustomerPiiPlatformSyncResult = (customerId: string) => ({
  id: customerId,
  message: 'PII data synchronized to TCRN PII Platform',
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
