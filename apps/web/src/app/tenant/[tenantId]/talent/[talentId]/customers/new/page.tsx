import { CustomerCreateScreen } from '@/domains/customer-management/screens/CustomerCreateScreen';

export default async function CustomerCreatePage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;

  return <CustomerCreateScreen tenantId={tenantId} talentId={talentId} />;
}
