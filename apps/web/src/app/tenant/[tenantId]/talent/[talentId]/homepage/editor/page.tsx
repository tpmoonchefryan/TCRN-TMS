import { redirect } from 'next/navigation';

export default async function TalentHomepageEditorPage({
  params,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
}>) {
  const { tenantId, talentId } = await params;
  redirect(`/homepage-editor/${tenantId}/${talentId}`);
}
