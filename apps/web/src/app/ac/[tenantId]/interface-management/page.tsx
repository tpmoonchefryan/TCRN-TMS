import { AcBusinessRouteUnavailableScreen } from '@/domains/integration-management/screens/AcBusinessRouteUnavailableScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcInterfaceManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <AcBusinessRouteUnavailableScreen surface="interfaces" tenantId={tenantId} />;
}
