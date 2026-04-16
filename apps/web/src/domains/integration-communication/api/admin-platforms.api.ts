// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  integrationApi,
  type IntegrationPlatformRecord,
} from '@/lib/api/modules/integration';

export type AdminPlatformRecord = IntegrationPlatformRecord;

export const adminPlatformsDomainApi = {
  listPlatforms: () => integrationApi.listPlatforms(),
};
