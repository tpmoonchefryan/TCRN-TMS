import { HierarchyBusinessOverviewScreen } from '@/domains/hierarchy-business/screens/HierarchyBusinessOverviewScreen';

export default async function TenantBusinessWorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <HierarchyBusinessOverviewScreen tenantId={tenantId} scopeType="tenant" />;
}
