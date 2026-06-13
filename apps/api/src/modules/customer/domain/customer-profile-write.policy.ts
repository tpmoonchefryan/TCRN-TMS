// SPDX-License-Identifier: Apache-2.0
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
  expectedVersion: number
): boolean => customer.version !== expectedVersion;

export const buildCustomerProfileActivationResult = (id: string, isActive: boolean) => ({
  id,
  isActive,
});
