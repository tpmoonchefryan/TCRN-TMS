import { PublicPresenceStudioScreen } from '@/domains/public-presence-studio/screens/PublicPresenceStudioScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceStudioScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
