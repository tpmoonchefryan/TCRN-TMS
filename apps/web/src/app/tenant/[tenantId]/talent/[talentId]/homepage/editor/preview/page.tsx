import { redirect } from 'next/navigation';

export default async function TalentHomepageEditorPreviewPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ previewId?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { previewId } = await searchParams;
  const query = previewId ? `?previewId=${encodeURIComponent(previewId)}` : '';
  redirect(`/homepage-editor/${tenantId}/${talentId}/preview${query}`);
}
