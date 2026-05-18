import { PublicPresenceStudioScreen } from '@/domains/public-presence-studio/screens/PublicPresenceStudioScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function PublicPresenceStudioEditorPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ focus?: string; templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { focus, templateId } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceStudioScreen
        initialFocus={focus ?? null}
        initialTemplateId={templateId ?? null}
        tenantId={tenantId}
        talentId={talentId}
      />
    </TalentBusinessAccessGate>
  );
}
