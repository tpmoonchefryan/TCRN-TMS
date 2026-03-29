// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  ExternalBlocklistListQuery,
  ExternalBlocklistOwnerScope,
  ExternalBlocklistOwnerType,
  ExternalBlocklistScopePayload,
} from './configuration';

export function toExternalBlocklistOwnerScope(
  ownerType: ExternalBlocklistOwnerType,
  ownerId?: string,
): ExternalBlocklistOwnerScope | null {
  if (ownerType === 'tenant') {
    return { ownerType };
  }

  if (!ownerId) {
    return null;
  }

  return {
    ownerType,
    ownerId,
  };
}

export function toExternalBlocklistScopePayload(
  scopeType: ExternalBlocklistOwnerType,
  scopeId?: string,
): ExternalBlocklistScopePayload | null {
  if (scopeType === 'tenant') {
    return { scopeType };
  }

  if (!scopeId) {
    return null;
  }

  return {
    scopeType,
    scopeId,
  };
}

export function toExternalBlocklistListQuery(
  scopeType: ExternalBlocklistOwnerType,
  scopeId?: string,
  extra?: Omit<ExternalBlocklistListQuery, 'scopeType' | 'scopeId'>,
): ExternalBlocklistListQuery | null {
  const scopePayload = toExternalBlocklistScopePayload(scopeType, scopeId);

  if (!scopePayload) {
    return null;
  }

  return {
    ...extra,
    ...scopePayload,
  };
}
