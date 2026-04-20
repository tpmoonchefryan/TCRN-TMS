import { ReportsManagementScreen } from '@/domains/reports-management/screens/ReportsManagementScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentReportsManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <ReportsManagementScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
