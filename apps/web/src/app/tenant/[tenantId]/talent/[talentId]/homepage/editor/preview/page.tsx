import { redirect } from 'next/navigation';

import { buildTalentWorkspaceSectionPath } from '@/platform/routing/workspace-paths';

export default async function TalentHomepageEditorPreviewPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;
  redirect(buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage'));
}
