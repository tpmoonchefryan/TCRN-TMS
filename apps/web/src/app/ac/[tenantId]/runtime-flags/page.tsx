import { RuntimeFlagsScreen } from '@/domains/runtime-flags/screens/RuntimeFlagsScreen';

export default async function AcRuntimeFlagsPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <RuntimeFlagsScreen tenantId={tenantId} />;
}
