import { UserEditorScreen } from '@/domains/user-management/screens/UserEditorScreen';

export default async function AcUserCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <UserEditorScreen tenantId={tenantId} mode="create" workspaceKind="ac" />;
}
