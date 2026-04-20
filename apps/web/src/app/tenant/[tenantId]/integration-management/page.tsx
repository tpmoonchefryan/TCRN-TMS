import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';

export default async function IntegrationManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <IntegrationManagementScreen tenantId={tenantId} />;
}
