// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export interface MembershipRecordAccessRecord {
  id: string;
  profileStoreId: string;
  nickname: string;
}

export interface MembershipRecordListItem {
  id: string;
  platformCode: string;
  platformName: string;
  classCode: string;
  className: string;
  typeCode: string;
  typeName: string;
  levelCode: string;
  levelName: string;
  levelRank: number;
  levelColor: string | null;
  levelBadgeUrl: string | null;
  validFrom: Date;
  validTo: Date | null;
  autoRenew: boolean;
  isExpired: boolean;
  note: string | null;
  createdAt: Date;
}

export interface MembershipRecordCreateResultRow {
  id: string;
  validFrom: Date;
  validTo: Date | null;
  autoRenew: boolean;
  createdAt: Date;
}

export interface MembershipRecordUpdateLookupRow {
  id: string;
  validTo: Date | null;
  autoRenew: boolean;
  note: string | null;
  platformCode: string;
  levelCode: string;
}

export interface MembershipRecordUpdatedRow {
  id: string;
  validTo: Date | null;
  autoRenew: boolean;
  note: string | null;
  updatedAt: Date;
}

export interface MembershipSummaryHighestLevel {
  platformCode: string;
  platformName: string;
  levelCode: string;
  levelName: string;
  color: string | null;
}

export const mapMembershipRecordListItem = (
  item: MembershipRecordListItem,
) => ({
  id: item.id,
  platform: {
    code: item.platformCode,
    name: item.platformName,
  },
  membershipClass: {
    code: item.classCode,
    name: item.className,
  },
  membershipType: {
    code: item.typeCode,
    name: item.typeName,
  },
  membershipLevel: {
    code: item.levelCode,
    name: item.levelName,
    rank: item.levelRank,
    color: item.levelColor,
    badgeUrl: item.levelBadgeUrl,
  },
  validFrom: item.validFrom,
  validTo: item.validTo,
  autoRenew: item.autoRenew,
  isExpired: item.isExpired || (item.validTo && item.validTo <= new Date()),
  note: item.note,
  createdAt: item.createdAt,
});

export const buildMembershipRecordCreateResult = (
  record: MembershipRecordCreateResultRow,
  platform: {
    code: string;
    displayName: string;
  },
  membershipLevel: {
    code: string;
    nameEn: string;
  },
) => ({
  id: record.id,
  platform: {
    code: platform.code,
    name: platform.displayName,
  },
  membershipLevel: {
    code: membershipLevel.code,
    name: membershipLevel.nameEn,
  },
  validFrom: record.validFrom,
  validTo: record.validTo,
  autoRenew: record.autoRenew,
  createdAt: record.createdAt,
});

export const buildMembershipRecordUpdateResult = (
  updated: MembershipRecordUpdatedRow,
) => ({
  id: updated.id,
  validTo: updated.validTo,
  autoRenew: updated.autoRenew,
  note: updated.note,
  updatedAt: updated.updatedAt,
});

export const buildMembershipRecordObjectName = (
  platformCode: string,
  membershipLevelCode: string,
) => `${platformCode}:${membershipLevelCode}`;

export const buildMembershipRecordCreateChangeLogDiff = (
  args: {
    platformCode: string;
    membershipLevelCode: string;
    validFrom: string;
    validTo?: string;
  },
) => JSON.stringify({
  new: {
    platformCode: args.platformCode,
    membershipLevelCode: args.membershipLevelCode,
    validFrom: args.validFrom,
    validTo: args.validTo,
  },
});

export const buildMembershipRecordUpdateChangeLogDiff = (
  record: MembershipRecordUpdateLookupRow,
  updated: MembershipRecordUpdatedRow,
) => JSON.stringify({
  old: {
    validTo: record.validTo,
    autoRenew: record.autoRenew,
    note: record.note,
  },
  new: {
    validTo: updated.validTo,
    autoRenew: updated.autoRenew,
    note: updated.note,
  },
});

export const buildMembershipSummaryResult = (
  highestLevel: MembershipSummaryHighestLevel | null,
  counts: {
    activeCount: number;
    totalCount: number;
  },
) => {
  if (!highestLevel) {
    return null;
  }

  return {
    highestLevel: {
      platformCode: highestLevel.platformCode,
      platformName: highestLevel.platformName,
      levelCode: highestLevel.levelCode,
      levelName: highestLevel.levelName,
      color: highestLevel.color,
    },
    activeCount: counts.activeCount,
    totalCount: counts.totalCount,
  };
};
