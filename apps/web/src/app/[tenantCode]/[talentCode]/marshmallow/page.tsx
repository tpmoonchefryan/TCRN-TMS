import { PublicMarshmallowScreen } from '@/domains/public-marshmallow/screens/PublicMarshmallowScreen';

export default async function SharedDomainMarshmallowPage({
  params,
}: Readonly<{
  params: Promise<{ tenantCode: string; talentCode: string }>;
}>) {
  const { talentCode, tenantCode } = await params;

  return (
    <PublicMarshmallowScreen
      path={`${tenantCode}/${talentCode}`}
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || ''}
    />
  );
}
