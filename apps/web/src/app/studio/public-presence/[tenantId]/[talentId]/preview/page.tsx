import { PublicPresencePreviewScreen } from '@/domains/public-presence-studio/screens/PublicPresencePreviewScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function PublicPresenceStudioPreviewPage({
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
      <PublicPresencePreviewScreen
        initialTemplateId={templateId ?? null}
        tenantId={tenantId}
        talentId={talentId}
      />
    </TalentBusinessAccessGate>
  );
}
