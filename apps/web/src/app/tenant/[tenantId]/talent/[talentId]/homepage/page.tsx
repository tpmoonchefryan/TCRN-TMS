import { HomepageManagementScreen } from '@/domains/homepage-management/screens/HomepageManagementScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <HomepageManagementScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
