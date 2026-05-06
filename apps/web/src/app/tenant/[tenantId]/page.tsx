import { redirect } from 'next/navigation';

import { buildTenantOrganizationStructurePath } from '@/platform/routing/workspace-paths';

export default async function TenantWorkspaceLandingPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  redirect(buildTenantOrganizationStructurePath(tenantId));
}
