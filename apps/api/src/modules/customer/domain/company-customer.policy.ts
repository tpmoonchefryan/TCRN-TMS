// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type CompanyPiiDataDto,
  type CreateCompanyCustomerDto,
  ProfileType,
  type UpdateCompanyCustomerDto,
} from '../dto/customer.dto';

export interface CompanyCustomerTalentRecord {
  id: string;
  profileStoreId: string | null;
}

export interface CompanyCustomerAccessRecord {
  id: string;
  profileType: string;
  profileStoreId: string | null;
  nickname: string;
  version: number;
  primaryLanguage: string | null;
  statusId: string | null;
  tags: string[];
  notes: string | null;
}

export interface CompanyCustomerCreatedRecord {
  id: string;
  nickname: string;
  createdAt: Date;
}

export interface CompanyCustomerUpdatedRecord {
  id: string;
  nickname: string;
  version: number;
  updatedAt: Date;
}

export interface CompanyCustomerProfileUpdateInput {
  nickname?: string;
  primaryLanguage?: string;
  statusId?: string;
  tags?: string[];
  notes?: string;
}

export interface CompanyCustomerInfoUpdateInput {
  companyLegalName?: string;
  companyShortName?: string;
  registrationNumber?: string;
  vatId?: string;
  establishmentDate?: Date | null;
  businessSegmentId?: string;
  website?: string;
}

export const hasCompanyCustomerVersionMismatch = (
  customer: CompanyCustomerAccessRecord,
  version: number,
) => customer.version !== version;

export const toCompanyCustomerProfileUpdateInput = (
  dto: UpdateCompanyCustomerDto,
  statusId: string | null,
): CompanyCustomerProfileUpdateInput => {
  const input: CompanyCustomerProfileUpdateInput = {};

  if (dto.nickname !== undefined) {
    input.nickname = dto.nickname;
  }
  if (dto.primaryLanguage !== undefined) {
    input.primaryLanguage = dto.primaryLanguage;
  }
  if (statusId !== null) {
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

export const toCompanyCustomerInfoUpdateInput = (
  dto: UpdateCompanyCustomerDto,
  businessSegmentId: string | null,
): CompanyCustomerInfoUpdateInput => {
  const input: CompanyCustomerInfoUpdateInput = {};

  if (dto.companyLegalName !== undefined) {
    input.companyLegalName = dto.companyLegalName;
  }
  if (dto.companyShortName !== undefined) {
    input.companyShortName = dto.companyShortName;
  }
  if (dto.registrationNumber !== undefined) {
    input.registrationNumber = dto.registrationNumber;
  }
  if (dto.vatId !== undefined) {
    input.vatId = dto.vatId;
  }
  if (dto.establishmentDate !== undefined) {
    input.establishmentDate = dto.establishmentDate
      ? new Date(dto.establishmentDate)
      : null;
  }
  if (businessSegmentId !== null) {
    input.businessSegmentId = businessSegmentId;
  }
  if (dto.website !== undefined) {
    input.website = dto.website;
  }

  return input;
};

export const hasCompanyCustomerInfoUpdates = (
  input: CompanyCustomerInfoUpdateInput,
) => Object.values(input).some((value) => value !== undefined);

export const buildCompanyCustomerCreateResult = (
  customer: CompanyCustomerCreatedRecord,
  dto: CreateCompanyCustomerDto,
) => ({
  id: customer.id,
  profileType: ProfileType.COMPANY,
  nickname: customer.nickname,
  company: {
    companyLegalName: dto.companyLegalName,
    companyShortName: dto.companyShortName,
  },
  createdAt: customer.createdAt,
});

export const buildCompanyCustomerUpdateResult = (
  updated: CompanyCustomerUpdatedRecord,
) => ({
  id: updated.id,
  nickname: updated.nickname,
  version: updated.version,
  updatedAt: updated.updatedAt,
});

export const buildCompanyCustomerChangeLogOldValue = (
  customer: CompanyCustomerAccessRecord,
) => ({
  nickname: customer.nickname,
  primaryLanguage: customer.primaryLanguage,
  statusId: customer.statusId,
  tags: customer.tags,
  notes: customer.notes,
});

export const buildCompanyCustomerChangeLogNewValue = (
  nickname: string,
  dto: UpdateCompanyCustomerDto,
) => ({
  nickname,
  primaryLanguage: dto.primaryLanguage,
  statusCode: dto.statusCode,
  tags: dto.tags,
  notes: dto.notes,
  companyLegalName: dto.companyLegalName,
  companyShortName: dto.companyShortName,
  registrationNumber: dto.registrationNumber,
  vatId: dto.vatId,
  establishmentDate: dto.establishmentDate,
  businessSegmentCode: dto.businessSegmentCode,
  website: dto.website,
});

export const buildCompanyCustomerAccessLogFieldChanges = (
  dto: UpdateCompanyCustomerDto,
) => JSON.stringify({
  nickname: dto.nickname,
  primaryLanguage: dto.primaryLanguage,
  statusCode: dto.statusCode,
  tags: dto.tags,
  notes: dto.notes,
  companyLegalName: dto.companyLegalName,
  companyShortName: dto.companyShortName,
  registrationNumber: dto.registrationNumber,
  vatId: dto.vatId,
  establishmentDate: dto.establishmentDate,
  businessSegmentCode: dto.businessSegmentCode,
  website: dto.website,
});

export const hasCompanyPiiPayload = (
  pii?: CompanyPiiDataDto,
) => pii !== undefined;
