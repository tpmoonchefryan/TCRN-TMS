// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { tenantApi } from '@/lib/api/modules/configuration';
import { integrationApi } from '@/lib/api/modules/integration';
import { systemUserApi } from '@/lib/api/modules/user-management';

export interface AdminDashboardStats {
  activeTenants: number;
  totalUsers: number;
  apiConsumers: number;
  platformHealth: string;
}

export const adminDashboardDomainApi = {
  async loadStats(): Promise<AdminDashboardStats> {
    const [tenantsRes, usersRes, consumersRes] = await Promise.all([
      tenantApi.list(),
      systemUserApi.list({ pageSize: 1 }),
      integrationApi.listConsumers(),
    ]);

    const activeTenants = tenantsRes.success && tenantsRes.data
      ? tenantsRes.data.filter((tenant: { isActive?: boolean }) => tenant.isActive !== false).length
      : 0;

    const totalUsers = usersRes.success && usersRes.meta?.pagination?.totalCount
      ? usersRes.meta.pagination.totalCount
      : usersRes.success && usersRes.data
        ? usersRes.data.length
        : 0;

    const apiConsumers = consumersRes.success && consumersRes.data
      ? consumersRes.data.filter((consumer) => consumer.isActive !== false).length
      : 0;

    return {
      activeTenants,
      totalUsers,
      apiConsumers,
      platformHealth: tenantsRes.success && usersRes.success && consumersRes.success ? '100%' : '-',
    };
  },
};
