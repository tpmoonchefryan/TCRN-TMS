import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';
import { buildPublicPresenceAdvancedIdePath } from '@/platform/routing/workspace-paths';

export default async function PublicPresenceAdvancedIdePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ mode?: 'page-source' | 'custom-html' | 'registry-snippets'; templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { mode, templateId } = await searchParams;
  const resolvedMode =
    mode === 'page-source' || mode === 'custom-html' || mode === 'registry-snippets'
      ? mode
      : 'page-source';
  buildPublicPresenceAdvancedIdePath(tenantId, talentId, {
    mode: resolvedMode,
    templateId: templateId ?? null,
  });

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      <PublicPresenceAuthoringIdeScreen
        advancedMode={resolvedMode}
        target="advanced"
        talentId={talentId}
        templateId={templateId ?? null}
        tenantId={tenantId}
      />
    </TalentBusinessAccessGate>
  );
}
