import { WebhookManagementScreen } from '@/domains/webhook-management/screens/WebhookManagementScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcWebhookManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <WebhookManagementScreen tenantId={tenantId} workspaceKind="ac" />;
}
