import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';

export default async function AcIntegrationManagementPage(
  props: PageProps<'/ac/[tenantId]/integration-management'>,
) {
  const { tenantId } = await props.params;

  return <IntegrationManagementScreen tenantId={tenantId} workspaceKind="ac" />;
}
