import { InterfaceManagementScreen } from '@/domains/interface-management/screens/InterfaceManagementScreen';

export default async function InterfaceManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <InterfaceManagementScreen tenantId={tenantId} />;
}
