// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  tenantApi,
  type TenantRecord,
  type TenantUpdatePayload,
} from '@/lib/api/modules/configuration';

export type AdminTenantRecord = TenantRecord;

export const adminTenantsDomainApi = {
  list: () => tenantApi.list(),
  get: (tenantId: string) => tenantApi.get(tenantId),
  update: (tenantId: string, payload: TenantUpdatePayload) => tenantApi.update(tenantId, payload),
  activate: (tenantId: string) => tenantApi.activate(tenantId),
  deactivate: (tenantId: string, reason?: string) => tenantApi.deactivate(tenantId, reason),
};
