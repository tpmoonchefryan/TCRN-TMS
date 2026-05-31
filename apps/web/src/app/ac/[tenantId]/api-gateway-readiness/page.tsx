import { ApiGatewayReadinessScreen } from '@/domains/api-gateway-readiness/screens/ApiGatewayReadinessScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcApiGatewayReadinessPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <ApiGatewayReadinessScreen tenantId={tenantId} />;
}
