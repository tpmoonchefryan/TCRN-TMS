import type { Metadata } from 'next';

import { buildPublicHomepageMetadata } from '@/domains/public-homepage/public-homepage.metadata';
import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ tenantCode: string; talentCode: string }>;
}>): Promise<Metadata> {
  const { talentCode, tenantCode } = await params;

  return buildPublicHomepageMetadata(`${tenantCode}/${talentCode}`);
}

export default async function SharedDomainHomepagePage({
  params,
}: Readonly<{
  params: Promise<{ tenantCode: string; talentCode: string }>;
}>) {
  const { talentCode, tenantCode } = await params;

  return <PublicHomepageScreen path={`${tenantCode}/${talentCode}`} />;
}
