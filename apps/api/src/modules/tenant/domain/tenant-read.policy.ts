// SPDX-License-Identifier: Apache-2.0

export const canAccessRequestedTenant = (tenantId: string, requestedTenantId: string): boolean =>
  tenantId === requestedTenantId;
