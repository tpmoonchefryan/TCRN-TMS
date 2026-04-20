import { PublicMarshmallowScreen } from '@/domains/public-marshmallow/screens/PublicMarshmallowScreen';

export default async function PublicMarshmallowPage({
  params,
}: Readonly<{
  params: Promise<{ path: string }>;
}>) {
  const { path } = await params;

  return (
    <PublicMarshmallowScreen
      path={path}
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || ''}
    />
  );
}
