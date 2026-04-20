import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';

export default async function SharedDomainHomepagePage({
  params,
}: Readonly<{
  params: Promise<{ tenantCode: string; talentCode: string }>;
}>) {
  const { talentCode, tenantCode } = await params;

  return <PublicHomepageScreen path={`${tenantCode}/${talentCode}`} />;
}
