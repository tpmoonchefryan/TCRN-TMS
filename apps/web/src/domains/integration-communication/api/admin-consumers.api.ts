// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  integrationApi,
  type IntegrationConsumerRecord,
} from '@/lib/api/modules/integration';

export type AdminConsumerRecord = IntegrationConsumerRecord;

export const adminConsumersDomainApi = {
  listConsumers: () => integrationApi.listConsumers(),
};
