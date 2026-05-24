import { redirect } from 'next/navigation';

import { buildPublicPresenceHomepageSurfacePath } from '@/platform/routing/workspace-paths';

export default async function PublicPresenceComponentAuthoringPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;
  redirect(buildPublicPresenceHomepageSurfacePath(tenantId, talentId));
}
