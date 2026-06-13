// SPDX-License-Identifier: Apache-2.0
import type { ProfileType } from '../dto/customer.dto';

export interface TalentArchiveBindingRecord {
  id: string;
  profileStoreId: string | null;
  profileStoreIsActive: boolean | null;
}

export interface CustomerArchiveAccessRecord {
  id: string;
  profileType: ProfileType;
  profileStoreId: string;
  nickname: string;
  version: number;
  isActive: boolean;
  primaryLanguage: string | null;
  statusId: string | null;
  tags: string[];
  notes: string | null;
}

export interface TalentArchiveReadiness {
  talentId: string;
  hasArchiveTarget: boolean;
  hasActiveArchiveTarget: boolean;
}

export const hasActiveArchiveTarget = (binding: TalentArchiveBindingRecord | null): boolean =>
  Boolean(binding?.profileStoreId && binding.profileStoreIsActive);
