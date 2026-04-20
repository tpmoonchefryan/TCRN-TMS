import { SubsidiarySettingsScreen } from '@/domains/config-dictionary-settings/screens/SubsidiarySettingsScreen';

export default async function SubsidiarySettingsPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; subsidiaryId: string }>;
}>) {
  const { tenantId, subsidiaryId } = await params;

  return <SubsidiarySettingsScreen tenantId={tenantId} subsidiaryId={subsidiaryId} />;
}
