import { TenantWorkspaceLandingScreen } from '@/domains/talent-workspace/screens/TenantWorkspaceLandingScreen';

export default async function TenantWorkspaceLandingPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <TenantWorkspaceLandingScreen tenantId={tenantId} />;
}
