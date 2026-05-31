import type {
  ApiRegistryDocument,
  ApiRegistryDriftReport,
  BuilderApiReadonlyExport,
  GatewayRouteManifest,
  SwaggerExposurePolicy,
} from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function readApiRegistryDocument(request: RequestFn) {
  return request<ApiRegistryDocument>('/api/v1/api-registry/document');
}

export function readApiRegistryDriftReport(request: RequestFn) {
  return request<ApiRegistryDriftReport>('/api/v1/api-registry/drift-report');
}

export function readSwaggerExposurePolicy(request: RequestFn) {
  return request<SwaggerExposurePolicy>('/api/v1/api-registry/swagger-exposure-policy');
}

export function readGatewayRouteManifest(request: RequestFn) {
  return request<GatewayRouteManifest>('/api/v1/api-registry/gateway-route-manifest');
}

export function readBuilderApiReadonlyExport(request: RequestFn) {
  return request<BuilderApiReadonlyExport>('/api/v1/api-registry/builder-readonly-export');
}
