import { HomepageEditorScreen } from '@/domains/homepage-management/screens/HomepageEditorScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageEditorPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <HomepageEditorScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
