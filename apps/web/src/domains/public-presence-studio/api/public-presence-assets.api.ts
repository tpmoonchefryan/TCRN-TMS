import type {
  HomepageComponentType,
  LocalizedText,
  PublicPresenceAssetDetail,
  PublicPresenceAssetKind,
  PublicPresenceAssetListEntry,
  PublicPresenceAssetScopeType,
  PublicPresenceSourceBundleFile,
  PublicPresenceTemplateId,
} from '@tcrn/shared';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface PublicPresenceAssetScopeInput {
  scopeId?: string | null;
  scopeType?: PublicPresenceAssetScopeType;
}

export interface CreatePublicPresenceAssetInput {
  assetKind: PublicPresenceAssetKind;
  code?: string | null;
  componentType?: HomepageComponentType | null;
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  sourceBundle?: PublicPresenceSourceBundleFile[];
  templateId?: PublicPresenceTemplateId | null;
}

export interface UpdatePublicPresenceAssetRevisionInput {
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  sourceBundle: PublicPresenceSourceBundleFile[];
}

export interface DuplicatePublicPresenceAssetInput {
  code?: string | null;
  description?: Partial<LocalizedText> | null;
  name?: Partial<LocalizedText> | null;
}

function appendAssetScope(
  path: string,
  scope: PublicPresenceAssetScopeInput = {},
  extraParams?: URLSearchParams,
) {
  const params = extraParams ?? new URLSearchParams();

  if (scope.scopeType) {
    params.set('scopeType', scope.scopeType);
  }

  if (scope.scopeId) {
    params.set('scopeId', scope.scopeId);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function listPublicPresenceAssets(
  request: RequestFn,
  input: PublicPresenceAssetScopeInput & { assetKind: PublicPresenceAssetKind },
) {
  const params = new URLSearchParams();
  params.set('assetKind', input.assetKind);

  return request<PublicPresenceAssetListEntry[]>(
    appendAssetScope('/api/v1/public-presence/assets', input, params),
  );
}

export function readPublicPresenceAsset(
  request: RequestFn,
  assetId: string,
  scope: PublicPresenceAssetScopeInput = {},
) {
  return request<PublicPresenceAssetDetail>(
    appendAssetScope(`/api/v1/public-presence/assets/${assetId}`, scope),
  );
}

export function createPublicPresenceAsset(
  request: RequestFn,
  input: CreatePublicPresenceAssetInput,
  scope: PublicPresenceAssetScopeInput = {},
) {
  return request<PublicPresenceAssetDetail>(
    appendAssetScope('/api/v1/public-presence/assets', scope),
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function savePublicPresenceAssetDraft(
  request: RequestFn,
  assetId: string,
  input: UpdatePublicPresenceAssetRevisionInput,
  scope: PublicPresenceAssetScopeInput = {},
) {
  return request<PublicPresenceAssetDetail>(
    appendAssetScope(`/api/v1/public-presence/assets/${assetId}/current`, scope),
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    },
  );
}

export function validatePublicPresenceAssetDraft(
  request: RequestFn,
  assetId: string,
  input: UpdatePublicPresenceAssetRevisionInput,
  scope: PublicPresenceAssetScopeInput = {},
) {
  return request<PublicPresenceAssetDetail>(
    appendAssetScope(`/api/v1/public-presence/assets/${assetId}/current/validate`, scope),
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function duplicatePublicPresenceAsset(
  request: RequestFn,
  assetId: string,
  input: DuplicatePublicPresenceAssetInput = {},
  scope: PublicPresenceAssetScopeInput = {},
) {
  return request<PublicPresenceAssetDetail>(
    appendAssetScope(`/api/v1/public-presence/assets/${assetId}/duplicate`, scope),
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}
