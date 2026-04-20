import { ObservabilityScreen } from '@/domains/observability/screens/ObservabilityScreen';

export default async function ObservabilityPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <ObservabilityScreen tenantId={tenantId} />;
}
