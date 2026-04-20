import { ObservabilityScreen } from '@/domains/observability/screens/ObservabilityScreen';

export default async function AcObservabilityPage(
  props: PageProps<'/ac/[tenantId]/observability'>,
) {
  const { tenantId } = await props.params;

  return <ObservabilityScreen tenantId={tenantId} workspaceKind="ac" />;
}
