import { TenantSettingsScreen } from '@/domains/config-dictionary-settings/screens/TenantSettingsScreen';

export default async function TenantSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <TenantSettingsScreen tenantId={tenantId} />;
}
