// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { SystemRoleRecord } from '@tcrn/shared';

import { systemRoleApi } from '@/lib/api/modules/user-management';

export type ACSystemRoleRecord = SystemRoleRecord;

export const acRoleManagementDomainApi = {
  listRoles: () => systemRoleApi.list(),
  deleteRole: (roleId: string) => systemRoleApi.delete(roleId),
};
