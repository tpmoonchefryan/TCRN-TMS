import { TenantEditorScreen } from '@/domains/platform-tenant-management/screens/TenantEditorScreen';

export default async function AcTenantDetailPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; managedTenantId: string }>;
}>) {
  const { tenantId, managedTenantId } = await params;

  return <TenantEditorScreen acTenantId={tenantId} managedTenantId={managedTenantId} mode="edit" />;
}
