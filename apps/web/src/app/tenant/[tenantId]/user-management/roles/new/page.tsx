import { RoleEditorScreen } from '@/domains/user-management/screens/RoleEditorScreen';

export default async function TenantRoleCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <RoleEditorScreen tenantId={tenantId} mode="create" />;
}
