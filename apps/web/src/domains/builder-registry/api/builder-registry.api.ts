import type {
  BuilderComposedOperationDryRun,
  BuilderRegistryArtifactDownload,
  BuilderRegistryArtifactKind,
  BuilderRegistryModulesResponse,
  BuilderRegistryOperationDetail,
  BuilderRegistrySummary,
  SupportedUiLocale,
} from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function readBuilderRegistrySummary(request: RequestFn, fresh = false) {
  return request<BuilderRegistrySummary>(`/api/v1/builder-registry/summary?fresh=${fresh}`);
}

export function readBuilderRegistryModules(request: RequestFn, locale: SupportedUiLocale) {
  return request<BuilderRegistryModulesResponse>(
    `/api/v1/builder-registry/modules?locale=${encodeURIComponent(locale)}`
  );
}

export function readBuilderRegistryOperation(request: RequestFn, operationCode: string) {
  return request<BuilderRegistryOperationDetail>(
    `/api/v1/builder-registry/operations/${encodeURIComponent(operationCode)}`
  );
}

export function readBuilderRegistryArtifact(
  request: RequestFn,
  artifactKind: BuilderRegistryArtifactKind
) {
  return request<BuilderRegistryArtifactDownload>(
    `/api/v1/builder-registry/artifacts/${artifactKind}`
  );
}

export function readBuilderRegistryComposedDryRun(request: RequestFn) {
  return request<BuilderComposedOperationDryRun>(
    '/api/v1/builder-registry/composed-dry-run/ac-capability-surface-overview'
  );
}
