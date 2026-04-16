// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  CreatePlatformIdentityDto,
  UpdatePlatformIdentityDto,
} from '../dto/customer.dto';

export interface PlatformIdentityAccessRecord {
  id: string;
  profileStoreId: string;
  nickname: string;
}

export interface PlatformIdentityListRecord {
  id: string;
  platformId: string;
  platformCode: string;
  platformName: string;
  platformIconUrl: string | null;
  platformColor: string | null;
  platformUid: string;
  platformNickname: string | null;
  platformAvatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  capturedAt: Date;
  updatedAt: Date;
}

export interface PlatformIdentityOwnedRecord {
  id: string;
  platformId: string;
  platformCode: string;
  profileUrlTemplate: string | null;
  platformUid: string;
  platformNickname: string | null;
  platformAvatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
}

export interface PlatformIdentityUpdatedRecord {
  id: string;
  platformUid: string;
  platformNickname: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  updatedAt: Date;
}

export interface PlatformIdentityHistoryRecord {
  id: string;
  identityId: string;
  platformCode: string;
  platformName: string;
  changeType: string;
  oldValue: string | null;
  newValue: string | null;
  capturedAt: Date;
  capturedBy: string | null;
}

export interface PlatformIdentityChange {
  type: string;
  oldValue: string | null;
  newValue: string | null;
}

export const mapPlatformIdentityListRecord = (
  record: PlatformIdentityListRecord,
) => ({
  id: record.id,
  platform: {
    id: record.platformId,
    code: record.platformCode,
    name: record.platformName,
    iconUrl: record.platformIconUrl,
    color: record.platformColor,
  },
  platformUid: record.platformUid,
  platformNickname: record.platformNickname,
  platformAvatarUrl: record.platformAvatarUrl,
  profileUrl: record.profileUrl,
  isVerified: record.isVerified,
  isCurrent: record.isCurrent,
  capturedAt: record.capturedAt,
  updatedAt: record.updatedAt,
});

export const buildPlatformIdentityCreateResult = (
  created: {
    id: string;
    platformUid: string;
    platformNickname: string | null;
    profileUrl: string | null;
    isVerified: boolean;
    isCurrent: boolean;
    capturedAt: Date;
  },
  platform: {
    id: string;
    code: string;
    displayName: string;
  },
) => ({
  id: created.id,
  platform: {
    id: platform.id,
    code: platform.code,
    name: platform.displayName,
  },
  platformUid: created.platformUid,
  platformNickname: created.platformNickname,
  profileUrl: created.profileUrl,
  isVerified: created.isVerified,
  isCurrent: created.isCurrent,
  capturedAt: created.capturedAt,
});

export const buildPlatformIdentityUpdateResult = (
  updated: PlatformIdentityUpdatedRecord,
) => ({
  id: updated.id,
  platformUid: updated.platformUid,
  platformNickname: updated.platformNickname,
  profileUrl: updated.profileUrl,
  isVerified: updated.isVerified,
  isCurrent: updated.isCurrent,
  updatedAt: updated.updatedAt,
});

export const mapPlatformIdentityHistoryRecord = (
  record: PlatformIdentityHistoryRecord,
) => ({
  id: record.id,
  identityId: record.identityId,
  platform: {
    code: record.platformCode,
    name: record.platformName,
  },
  changeType: record.changeType,
  oldValue: record.oldValue,
  newValue: record.newValue,
  capturedAt: record.capturedAt,
  capturedBy: record.capturedBy,
});

export const buildPlatformIdentityProfileUrl = (
  profileUrlTemplate: string | null,
  platformUid: string,
) => profileUrlTemplate
  ? profileUrlTemplate.replace('{uid}', platformUid)
  : null;

export const buildPlatformIdentityObjectName = (
  platformCode: string,
  platformUid: string,
) => `${platformCode}:${platformUid}`;

export const collectPlatformIdentityChanges = (
  identity: PlatformIdentityOwnedRecord,
  dto: UpdatePlatformIdentityDto,
): PlatformIdentityChange[] => {
  const changes: PlatformIdentityChange[] = [];

  if (dto.platformUid && dto.platformUid !== identity.platformUid) {
    changes.push({
      type: 'uid_changed',
      oldValue: identity.platformUid,
      newValue: dto.platformUid,
    });
  }

  if (
    dto.platformNickname !== undefined &&
    dto.platformNickname !== identity.platformNickname
  ) {
    changes.push({
      type: 'nickname_changed',
      oldValue: identity.platformNickname,
      newValue: dto.platformNickname ?? null,
    });
  }

  if (dto.isCurrent === false && identity.isCurrent === true) {
    changes.push({
      type: 'deactivated',
      oldValue: 'current',
      newValue: 'not_current',
    });
  }

  return changes;
};

export const buildPlatformIdentityUpdateInput = (
  identity: PlatformIdentityOwnedRecord,
  dto: UpdatePlatformIdentityDto,
) => {
  const platformUid = dto.platformUid ?? identity.platformUid;

  return {
    platformUid,
    platformNickname: dto.platformNickname ?? identity.platformNickname,
    platformAvatarUrl: dto.platformAvatarUrl ?? identity.platformAvatarUrl,
    profileUrl: dto.platformUid
      ? buildPlatformIdentityProfileUrl(identity.profileUrlTemplate, dto.platformUid)
      : identity.profileUrl,
    isVerified: dto.isVerified ?? identity.isVerified,
    isCurrent: dto.isCurrent ?? identity.isCurrent,
  };
};

export const buildPlatformIdentityCreateChangeLogDiff = (
  platformCode: string,
  dto: CreatePlatformIdentityDto,
) => JSON.stringify({
  new: {
    platformCode,
    platformUid: dto.platformUid,
    platformNickname: dto.platformNickname,
  },
});

export const buildPlatformIdentityUpdateChangeLogDiff = (
  identity: PlatformIdentityOwnedRecord,
  updated: PlatformIdentityUpdatedRecord,
) => JSON.stringify({
  old: {
    platformUid: identity.platformUid,
    platformNickname: identity.platformNickname,
    isCurrent: identity.isCurrent,
  },
  new: {
    platformUid: updated.platformUid,
    platformNickname: updated.platformNickname,
    isCurrent: updated.isCurrent,
  },
});
