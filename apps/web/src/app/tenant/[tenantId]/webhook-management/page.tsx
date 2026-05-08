import { WebhookManagementScreen } from '@/domains/webhook-management/screens/WebhookManagementScreen';

export default async function WebhookManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <WebhookManagementScreen tenantId={tenantId} />;
}
