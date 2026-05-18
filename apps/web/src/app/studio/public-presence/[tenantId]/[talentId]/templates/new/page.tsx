import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function PublicPresenceTemplateAuthoringPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { templateId } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId={talentId}
        templateId={templateId ?? null}
        tenantId={tenantId}
      />
    </TalentBusinessAccessGate>
  );
}
