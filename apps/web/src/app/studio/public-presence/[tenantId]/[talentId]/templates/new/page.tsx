import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function PublicPresenceTemplateAuthoringPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ componentDraftKey?: string; templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { componentDraftKey, templateId } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceAuthoringIdeScreen
        componentDraftKey={componentDraftKey ?? null}
        target="template"
        talentId={talentId}
        templateId={templateId ?? null}
        tenantId={tenantId}
      />
    </TalentBusinessAccessGate>
  );
}
