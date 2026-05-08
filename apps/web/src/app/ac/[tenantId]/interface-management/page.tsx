import { InterfaceManagementScreen } from '@/domains/interface-management/screens/InterfaceManagementScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcInterfaceManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <InterfaceManagementScreen tenantId={tenantId} workspaceKind="ac" />;
}
