import { TenantManagementScreen } from '@/domains/platform-tenant-management/screens/TenantManagementScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcTenantManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <TenantManagementScreen acTenantId={tenantId} />;
}
