import { RoleEditorScreen } from '@/domains/user-management/screens/RoleEditorScreen';

export default async function TenantRoleEditorPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; roleId: string }>;
}>) {
  const { tenantId, roleId } = await params;

  return <RoleEditorScreen tenantId={tenantId} systemRoleId={roleId} mode="edit" />;
}
