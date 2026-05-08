import { InterfaceAddAdapterScreen } from '@/domains/interface-management/screens/InterfaceAddAdapterScreen';

export default async function TenantInterfaceAddAdapterPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <InterfaceAddAdapterScreen tenantId={tenantId} />;
}
