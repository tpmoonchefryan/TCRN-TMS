// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type CreateSystemUserPayload,
  systemUserApi,
  type SystemUserDetailRecord,
  type SystemUserListItem,
  type UpdateSystemUserPayload,
} from '@/lib/api/modules/user-management';

export type ACSystemUserRecord = SystemUserListItem;
export type ACSystemUserDetailRecord = SystemUserDetailRecord;

export const acUserManagementDomainApi = {
  listUsers: () => systemUserApi.list(),
  getUser: (userId: string) => systemUserApi.get(userId),
  createUser: (payload: CreateSystemUserPayload) => systemUserApi.create(payload),
  updateUser: (userId: string, payload: UpdateSystemUserPayload) =>
    systemUserApi.update(userId, payload),
  resetPassword: (userId: string, forceReset = true) =>
    systemUserApi.resetPassword(userId, { forceReset }),
  deactivateUser: (userId: string) => systemUserApi.deactivate(userId),
  reactivateUser: (userId: string) => systemUserApi.reactivate(userId),
};
