// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type CreateIndividualCustomerDto,
  ProfileType,
  type UpdateIndividualCustomerDto,
} from '../dto/customer.dto';
import type { IndividualCustomerPiiCustomerRecord } from './individual-customer-pii.policy';

export interface IndividualCustomerCreatedRecord {
  id: string;
  nickname: string;
  createdAt: Date;
}

export interface IndividualCustomerUpdatedRecord {
  id: string;
  nickname: string;
  version: number;
  updatedAt: Date;
}

export interface IndividualCustomerUpdateInput {
  nickname?: string;
  primaryLanguage?: string;
  statusId?: string;
  tags?: string[];
  notes?: string;
}

export const hasIndividualCustomerVersionMismatch = (
  customer: IndividualCustomerPiiCustomerRecord,
  version: number,
) => customer.version !== version;

export const toIndividualCustomerUpdateInput = (
  dto: UpdateIndividualCustomerDto,
  statusId: string | undefined,
): IndividualCustomerUpdateInput => {
  const input: IndividualCustomerUpdateInput = {};

  if (dto.nickname !== undefined) {
    input.nickname = dto.nickname;
  }
  if (dto.primaryLanguage !== undefined) {
    input.primaryLanguage = dto.primaryLanguage;
  }
  if (statusId !== undefined) {
    input.statusId = statusId;
  }
  if (dto.tags !== undefined) {
    input.tags = dto.tags;
  }
  if (dto.notes !== undefined) {
    input.notes = dto.notes;
  }

  return input;
};

export const buildIndividualCustomerCreateResult = (
  customer: IndividualCustomerCreatedRecord,
) => ({
  id: customer.id,
  profileType: ProfileType.INDIVIDUAL,
  nickname: customer.nickname,
  createdAt: customer.createdAt,
});

export const buildIndividualCustomerUpdateResult = (
  updated: IndividualCustomerUpdatedRecord,
) => ({
  id: updated.id,
  nickname: updated.nickname,
  version: updated.version,
  updatedAt: updated.updatedAt,
});

export const buildIndividualCustomerCreateChangeLogNewValue = (
  dto: CreateIndividualCustomerDto,
  statusId: string | null,
) => ({
  profileType: ProfileType.INDIVIDUAL,
  nickname: dto.nickname,
  primaryLanguage: dto.primaryLanguage,
  statusId,
  tags: dto.tags,
  source: dto.source,
});

export const buildIndividualCustomerUpdateChangeLogOldValue = (
  customer: IndividualCustomerPiiCustomerRecord,
) => ({
  nickname: customer.nickname,
  primaryLanguage: customer.primaryLanguage,
  statusId: customer.statusId,
  tags: customer.tags,
  notes: customer.notes,
});

export const buildIndividualCustomerUpdateChangeLogNewValue = (
  updatedNickname: string,
  customer: IndividualCustomerPiiCustomerRecord,
  dto: UpdateIndividualCustomerDto,
  statusId: string | undefined,
) => ({
  nickname: updatedNickname,
  primaryLanguage: dto.primaryLanguage ?? customer.primaryLanguage,
  statusId: statusId ?? customer.statusId,
  tags: dto.tags ?? customer.tags,
  notes: dto.notes ?? customer.notes,
});
