import { ProfileScreen } from '@/domains/profile/screens/ProfileScreen';

export default async function TenantProfileSecurityPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <ProfileScreen tenantId={tenantId} mode="security" />;
}
