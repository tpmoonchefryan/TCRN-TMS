import type { Metadata } from 'next';

import { buildPublicHomepageMetadata } from '@/domains/public-homepage/public-homepage.metadata';
import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>): Promise<Metadata> {
  const { path } = await params;

  return buildPublicHomepageMetadata(path.join('/'));
}

export default async function PublicHomepagePage({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>) {
  const { path } = await params;

  return <PublicHomepageScreen path={path.join('/')} />;
}
