import { AcBusinessRouteUnavailableScreen } from '@/domains/integration-management/screens/AcBusinessRouteUnavailableScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcWebhookManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <AcBusinessRouteUnavailableScreen surface="webhooks" tenantId={tenantId} />;
}
