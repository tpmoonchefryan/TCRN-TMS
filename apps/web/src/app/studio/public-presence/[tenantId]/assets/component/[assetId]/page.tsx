import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';

export default async function PublicPresenceComponentAssetIdePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ assetId: string; tenantId: string }>;
  searchParams: Promise<{ scopeId?: string; scopeType?: 'tenant' | 'subsidiary' | 'talent' }>;
}>) {
  const { assetId, tenantId } = await params;
  const { scopeId, scopeType } = await searchParams;

  return (
    <PublicPresenceAuthoringIdeScreen
      assetId={assetId}
      assetScopeId={scopeId ?? null}
      assetScopeType={scopeType ?? 'tenant'}
      target="component"
      tenantId={tenantId}
    />
  );
}
