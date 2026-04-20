import { UserEditorScreen } from '@/domains/user-management/screens/UserEditorScreen';

export default async function AcUserEditorPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; systemUserId: string }>;
}>) {
  const { tenantId, systemUserId } = await params;

  return (
    <UserEditorScreen
      tenantId={tenantId}
      systemUserId={systemUserId}
      mode="edit"
      workspaceKind="ac"
    />
  );
}
