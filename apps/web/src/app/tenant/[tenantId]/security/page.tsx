import { SecurityManagementScreen } from '@/domains/security-management/screens/SecurityManagementScreen';

export default async function SecurityManagementPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <SecurityManagementScreen tenantId={tenantId} />;
}
