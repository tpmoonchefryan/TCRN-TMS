// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export interface CustomerExternalIdRecord {
  id: string;
  consumerId: string;
  consumerCode: string;
  consumerName: string;
  externalId: string;
  createdAt: Date;
  createdBy: string | null;
}

export interface CustomerExternalIdAccessRecord {
  id: string;
  profileStoreId: string;
  nickname: string;
}

export const mapCustomerExternalIdRecord = (record: CustomerExternalIdRecord) => ({
  id: record.id,
  consumer: {
    id: record.consumerId,
    code: record.consumerCode,
    name: record.consumerName,
  },
  externalId: record.externalId,
  createdAt: record.createdAt,
  createdBy: record.createdBy,
});

export const buildCustomerExternalIdObjectName = (
  consumerCode: string,
  externalId: string,
): string => `${consumerCode}:${externalId}`;

export const buildDuplicateCustomerExternalIdMessage = (
  consumerCode: string,
  externalId: string,
): string =>
  `External ID '${externalId}' already exists for consumer '${consumerCode}'`;
