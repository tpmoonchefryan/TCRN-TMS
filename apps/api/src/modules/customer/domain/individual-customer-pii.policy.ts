// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PiiDataDto } from '../dto/customer.dto';

export interface IndividualCustomerPiiCustomerRecord {
  id: string;
  profileType: string;
  profileStoreId: string;
  version: number;
  nickname?: string;
  primaryLanguage?: string | null;
  statusId?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface IndividualCustomerPiiTalentRecord {
  id: string;
  profileStoreId: string | null;
}

export const hasIndividualCustomerPiiVersionMismatch = (
  customer: IndividualCustomerPiiCustomerRecord,
  version: number,
) => customer.version !== version;

export const collectIndividualCustomerPiiUpdatedFields = (
  pii: Partial<PiiDataDto>,
) => Object.keys(pii);

export const buildIndividualCustomerPiiUpdateFieldChanges = (
  pii: Partial<PiiDataDto>,
) => JSON.stringify({
  fieldsUpdated: collectIndividualCustomerPiiUpdatedFields(pii),
});
