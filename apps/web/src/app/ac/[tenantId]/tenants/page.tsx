import { TenantManagementScreen } from '@/domains/platform-tenant-management/screens/TenantManagementScreen';

export default async function AcTenantManagementPage(props: PageProps<'/ac/[tenantId]/tenants'>) {
  const { tenantId } = await props.params;

  return <TenantManagementScreen acTenantId={tenantId} />;
}
