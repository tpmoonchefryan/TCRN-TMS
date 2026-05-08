'use client';

import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';

export function InterfaceManagementScreen({
  tenantId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  return (
    <IntegrationManagementScreen
      tenantId={tenantId}
      workspaceKind={workspaceKind}
      surface="interfaces"
    />
  );
}
