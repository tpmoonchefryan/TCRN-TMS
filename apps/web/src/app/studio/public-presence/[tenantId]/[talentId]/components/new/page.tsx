import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function PublicPresenceComponentAuthoringPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ componentType?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { componentType } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceAuthoringIdeScreen
        componentType={componentType ?? null}
        target="component"
        talentId={talentId}
        tenantId={tenantId}
      />
    </TalentBusinessAccessGate>
  );
}
