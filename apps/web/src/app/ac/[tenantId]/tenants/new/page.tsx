import { TenantEditorScreen } from '@/domains/platform-tenant-management/screens/TenantEditorScreen';

export default async function AcTenantCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <TenantEditorScreen acTenantId={tenantId} mode="create" />;
}
