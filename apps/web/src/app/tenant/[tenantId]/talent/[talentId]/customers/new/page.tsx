import { CustomerCreateScreen } from '@/domains/customer-management/screens/CustomerCreateScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function CustomerCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <CustomerCreateScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
