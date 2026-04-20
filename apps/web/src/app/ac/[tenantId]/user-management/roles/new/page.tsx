import { RoleEditorScreen } from '@/domains/user-management/screens/RoleEditorScreen';

export default async function AcRoleCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <RoleEditorScreen tenantId={tenantId} mode="create" workspaceKind="ac" />;
}
