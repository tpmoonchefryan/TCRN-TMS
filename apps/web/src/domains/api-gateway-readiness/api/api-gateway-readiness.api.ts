import type {
  ApiGatewayCutoverRunbook,
  ApiGatewayProvider,
  ApiGatewayReadinessSummary,
  ApiGatewayRenderedArtifact,
  ApiGatewayRoutePolicy,
} from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function readApiGatewayReadinessSummary(request: RequestFn) {
  return request<ApiGatewayReadinessSummary>('/api/v1/api-gateway-readiness/summary');
}

export function readApiGatewayRoutePolicy(request: RequestFn) {
  return request<ApiGatewayRoutePolicy>('/api/v1/api-gateway-readiness/route-policy');
}

export function readApiGatewayRenderedArtifact(request: RequestFn, provider: ApiGatewayProvider) {
  return request<ApiGatewayRenderedArtifact>(`/api/v1/api-gateway-readiness/rendered/${provider}`);
}

export function readApiGatewayCutoverRunbook(request: RequestFn) {
  return request<ApiGatewayCutoverRunbook>('/api/v1/api-gateway-readiness/cutover-runbook');
}
