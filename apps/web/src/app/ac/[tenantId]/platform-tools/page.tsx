import { PlatformToolConnectionsScreen } from '@/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen';

export default async function AcPlatformToolsPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;
  return <PlatformToolConnectionsScreen tenantId={tenantId} />;
}
