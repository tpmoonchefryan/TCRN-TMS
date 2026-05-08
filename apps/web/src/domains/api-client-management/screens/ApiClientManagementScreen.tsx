'use client';

import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';

export function ApiClientManagementScreen({
  tenantId,
}: Readonly<{
  tenantId: string;
}>) {
  return (
    <IntegrationManagementScreen
      tenantId={tenantId}
      workspaceKind="ac"
      surface="api-clients"
    />
  );
}
