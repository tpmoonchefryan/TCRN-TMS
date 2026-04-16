// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type CustomerProfileType = 'individual' | 'company';

export interface CustomerProfileListRecord {
  id: string;
  profileType: CustomerProfileType | string;
  nickname: string;
  primaryLanguage: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  statusId: string | null;
  statusCode: string | null;
  statusName: string | null;
  statusColor: string | null;
  companyShortName: string | null;
  originTalentId: string | null;
  originTalentDisplayName: string | null;
  membershipCount: bigint;
}

export interface CustomerProfileActiveMembershipRecord {
  customerId?: string;
  platformCode: string;
  platformName: string;
  levelCode: string;
  levelName: string;
  color: string | null;
}

export interface CustomerProfileDetailAggregate {
  id: string;
  talentId: string;
  profileStoreId: string;
  originTalentId: string;
  lastModifiedTalentId: string | null;
  profileType: CustomerProfileType | string;
  nickname: string;
  primaryLanguage: string | null;
  notes: string | null;
  tags: string[];
  source: string | null;
  isActive: boolean;
  inactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  talent: { id: string; code: string; displayName: string };
  profileStore: { id: string; code: string; nameEn: string };
  originTalent: { id: string; code: string; displayName: string };
  lastModifiedTalent: { id: string; code: string; displayName: string } | null;
  status: { id: string; code: string; nameEn: string; color: string | null } | null;
  inactivationReason: { id: string; code: string; nameEn: string } | null;
  companyInfo: {
    companyLegalName: string;
    companyShortName: string | null;
    registrationNumber: string | null;
    vatId: string | null;
    establishmentDate: Date | null;
    website: string | null;
    businessSegment: { id: string; code: string; nameEn: string } | null;
  } | null;
  membershipRecords: Array<{
    platform: { code: string; displayName: string };
    membershipLevel: { code: string; nameEn: string; color: string | null };
  }>;
  _count: { platformIdentities: number; membershipRecords: number };
  accessLogs: Array<{
    action: string;
    occurredAt: Date;
    talent: { id: string; displayName: string };
    operator: { id: string; username: string } | null;
  }>;
}

export const mapCustomerProfileListItem = (
  item: CustomerProfileListRecord,
  highestMembership?: CustomerProfileActiveMembershipRecord | null,
) => ({
  id: item.id,
  profileType: item.profileType,
  nickname: item.nickname,
  primaryLanguage: item.primaryLanguage,
  status: item.statusId
    ? {
        id: item.statusId,
        code: item.statusCode,
        name: item.statusName,
        color: item.statusColor,
      }
    : null,
  tags: item.tags ?? [],
  isActive: item.isActive,
  companyShortName: item.companyShortName ?? null,
  originTalent: item.originTalentId
    ? {
        id: item.originTalentId,
        displayName: item.originTalentDisplayName,
      }
    : null,
  membershipSummary: highestMembership
    ? {
        highestLevel: {
          platformCode: highestMembership.platformCode,
          platformName: highestMembership.platformName,
          levelCode: highestMembership.levelCode,
          levelName: highestMembership.levelName,
          color: highestMembership.color,
        },
        activeCount: 1,
        totalCount: Number(item.membershipCount),
      }
    : null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const mapCustomerProfileDetailItem = (item: CustomerProfileDetailAggregate) => {
  const highestMembership = item.membershipRecords[0];

  const base = {
    id: item.id,
    profileType: item.profileType,
    talentId: item.talentId,
    nickname: item.nickname,
    primaryLanguage: item.primaryLanguage,
    status: item.status
      ? {
          id: item.status.id,
          code: item.status.code,
          name: item.status.nameEn,
          color: item.status.color,
        }
      : null,
    inactivationReason: item.inactivationReason
      ? {
          id: item.inactivationReason.id,
          code: item.inactivationReason.code,
          name: item.inactivationReason.nameEn,
        }
      : null,
    tags: item.tags,
    source: item.source,
    notes: item.notes,
    isActive: item.isActive,
    inactivatedAt: item.inactivatedAt,
    profileStore: {
      id: item.profileStore.id,
      code: item.profileStore.code,
      name: item.profileStore.nameEn,
    },
    originTalent: {
      id: item.originTalent.id,
      code: item.originTalent.code,
      displayName: item.originTalent.displayName,
    },
    lastModifiedTalent: item.lastModifiedTalent
      ? {
          id: item.lastModifiedTalent.id,
          code: item.lastModifiedTalent.code,
          displayName: item.lastModifiedTalent.displayName,
        }
      : null,
    membershipSummary: highestMembership
      ? {
          highestLevel: {
            platformCode: highestMembership.platform.code,
            platformName: highestMembership.platform.displayName,
            levelCode: highestMembership.membershipLevel.code,
            levelName: highestMembership.membershipLevel.nameEn,
            color: highestMembership.membershipLevel.color,
          },
          activeCount: item.membershipRecords.length,
          totalCount: item._count.membershipRecords,
        }
      : null,
    platformIdentityCount: item._count.platformIdentities,
    recentAccessHistory: item.accessLogs.map((log) => ({
      talent: { id: log.talent.id, displayName: log.talent.displayName },
      action: log.action,
      operator: log.operator
        ? { id: log.operator.id, username: log.operator.username }
        : null,
      occurredAt: log.occurredAt,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    version: item.version,
  };

  if (item.profileType === 'individual') {
    return {
      ...base,
      individual: {
        piiReadbackEnabled: false,
      },
    };
  }

  if (item.profileType === 'company' && item.companyInfo) {
    return {
      ...base,
      company: {
        companyLegalName: item.companyInfo.companyLegalName,
        companyShortName: item.companyInfo.companyShortName,
        registrationNumber: item.companyInfo.registrationNumber,
        vatId: item.companyInfo.vatId,
        establishmentDate: item.companyInfo.establishmentDate,
        website: item.companyInfo.website,
        businessSegment: item.companyInfo.businessSegment
          ? {
              id: item.companyInfo.businessSegment.id,
              code: item.companyInfo.businessSegment.code,
              name: item.companyInfo.businessSegment.nameEn,
            }
          : null,
      },
    };
  }

  return base;
};
