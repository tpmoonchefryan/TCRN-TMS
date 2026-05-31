import { BuilderRegistryScreen } from '@/domains/builder-registry/screens/BuilderRegistryScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcBuilderRegistryPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <BuilderRegistryScreen tenantId={tenantId} />;
}
