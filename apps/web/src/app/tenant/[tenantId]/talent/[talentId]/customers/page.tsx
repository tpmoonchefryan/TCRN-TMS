import { CustomerManagementScreen } from '@/domains/customer-management/screens/CustomerManagementScreen';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentCustomerManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return (
    <TalentBusinessAccessGate tenantId={tenantId} talentId={talentId}>
      <CustomerManagementScreen tenantId={tenantId} talentId={talentId} />
    </TalentBusinessAccessGate>
  );
}
