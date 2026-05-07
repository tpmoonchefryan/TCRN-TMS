import { HomepageEditorPreviewScreen } from '@/domains/homepage-management/screens/HomepageEditorPreviewScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageEditorPreviewPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <HomepageEditorPreviewScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
