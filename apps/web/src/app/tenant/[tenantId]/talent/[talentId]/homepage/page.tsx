import { PublicPresenceManagementScreen } from '@/domains/public-presence-studio/screens/PublicPresenceManagementScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageManagementPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ surface?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { surface } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceManagementScreen
        surface={surface}
        talentId={talentId}
        tenantId={tenantId}
      />
    </TalentBusinessAccessGate>
  );
}
