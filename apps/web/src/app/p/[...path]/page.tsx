import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';

export default async function PublicHomepagePage({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>) {
  const { path } = await params;

  return <PublicHomepageScreen path={path.join('/')} />;
}
