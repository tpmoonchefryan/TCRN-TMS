import { ApiRegistryScreen } from '@/domains/api-registry/screens/ApiRegistryScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcApiRegistryPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <ApiRegistryScreen tenantId={tenantId} />;
}
