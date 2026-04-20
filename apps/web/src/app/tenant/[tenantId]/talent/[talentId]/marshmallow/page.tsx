import { MarshmallowManagementScreen } from '@/domains/marshmallow-management/screens/MarshmallowManagementScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentMarshmallowManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <MarshmallowManagementScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
