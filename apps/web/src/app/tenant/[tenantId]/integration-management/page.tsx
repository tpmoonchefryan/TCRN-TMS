import { redirect } from 'next/navigation';

export default async function IntegrationManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  redirect(`/tenant/${tenantId}/interface-management`);
}
