import { TalentSettingsScreen } from '@/domains/config-dictionary-settings/screens/TalentSettingsScreen';

export default async function TalentSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return <TalentSettingsScreen tenantId={tenantId} talentId={talentId} />;
}
