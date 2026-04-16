// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ProfileType } from '../dto/customer.dto';

export interface CustomerProfileAccessRecord {
  id: string;
  profileStoreId: string;
  nickname: string;
  profileType: ProfileType;
  isActive: boolean;
  version: number;
}

export const hasCustomerProfileVersionMismatch = (
  customer: CustomerProfileAccessRecord,
  expectedVersion: number,
): boolean => customer.version !== expectedVersion;

export const buildCustomerProfileActivationResult = (
  id: string,
  isActive: boolean,
) => ({ id, isActive });
