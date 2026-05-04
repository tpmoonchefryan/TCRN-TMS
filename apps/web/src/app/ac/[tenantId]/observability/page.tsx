import { ObservabilityScreen } from '@/domains/observability/screens/ObservabilityScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcObservabilityPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <ObservabilityScreen tenantId={tenantId} workspaceKind="ac" />;
}
