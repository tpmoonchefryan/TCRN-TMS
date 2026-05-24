import { redirect } from 'next/navigation';

import {
  buildPublicPresenceStudioEditorPath,
  type PublicPresenceStudioFocus,
} from '@/platform/routing/workspace-paths';

function normalizeStudioFocus(value?: string): PublicPresenceStudioFocus | null {
  return value === 'overview' || value === 'release' || value === 'countdown' ? value : null;
}

export default async function TalentHomepageEditorPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ focus?: string; templateId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { focus, templateId } = await searchParams;

  redirect(
    buildPublicPresenceStudioEditorPath(tenantId, talentId, templateId, normalizeStudioFocus(focus))
  );
}
