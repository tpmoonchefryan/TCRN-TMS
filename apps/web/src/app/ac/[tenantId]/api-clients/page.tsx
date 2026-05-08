import { ApiClientManagementScreen } from '@/domains/api-client-management/screens/ApiClientManagementScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcApiClientsPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <ApiClientManagementScreen tenantId={tenantId} />;
}
