import { redirect } from 'next/navigation';

import { buildPublicPresenceStudioPreviewPath } from '@/platform/routing/workspace-paths';

export default async function TalentHomepageEditorPreviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { templateId } = await searchParams;

  redirect(buildPublicPresenceStudioPreviewPath(tenantId, talentId, templateId));
}
