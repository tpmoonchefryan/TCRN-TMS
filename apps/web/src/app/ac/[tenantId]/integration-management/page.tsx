import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcIntegrationManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <IntegrationManagementScreen tenantId={tenantId} workspaceKind="ac" />;
}
