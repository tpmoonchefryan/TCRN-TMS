import { HierarchyBusinessOverviewScreen } from '@/domains/hierarchy-business/screens/HierarchyBusinessOverviewScreen';

export default async function SubsidiaryBusinessWorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; subsidiaryId: string }>;
}>) {
  const { tenantId, subsidiaryId } = await params;

  return (
    <HierarchyBusinessOverviewScreen
      tenantId={tenantId}
      scopeType="subsidiary"
      subsidiaryId={subsidiaryId}
    />
  );
}
