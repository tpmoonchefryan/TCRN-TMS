import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';
import { TalentWorkspaceOverviewScreen } from '@/domains/talent-workspace/screens/TalentWorkspaceOverviewScreen';

export default async function TalentWorkspaceOverviewPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <TalentWorkspaceOverviewScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
