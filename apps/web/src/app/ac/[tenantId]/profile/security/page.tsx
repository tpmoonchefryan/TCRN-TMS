import { ProfileScreen } from '@/domains/profile/screens/ProfileScreen';

export default async function AcProfileSecurityPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <ProfileScreen tenantId={tenantId} workspaceKind="ac" mode="security" />;
}
