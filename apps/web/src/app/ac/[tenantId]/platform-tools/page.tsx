import { PlatformToolConnectionsScreen } from '@/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen';

export default async function AcPlatformToolsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
  searchParams?: Promise<{ family?: string | string[] }>;
}>) {
  const { tenantId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawFamily = Array.isArray(resolvedSearchParams.family)
    ? resolvedSearchParams.family[0]
    : resolvedSearchParams.family;
  const initialFamily =
    rawFamily === 'observability'
      ? 'observability'
      : rawFamily === 'runtime_flags' || rawFamily === 'runtime-flags'
        ? 'runtime_flags'
        : undefined;

  return <PlatformToolConnectionsScreen tenantId={tenantId} initialFamily={initialFamily} />;
}
