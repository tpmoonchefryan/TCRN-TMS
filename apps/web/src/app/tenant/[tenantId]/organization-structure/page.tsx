import { OrganizationStructureScreen } from '@/domains/organization-access/screens/OrganizationStructureScreen';

export default async function OrganizationStructurePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <OrganizationStructureScreen tenantId={tenantId} />;
}
