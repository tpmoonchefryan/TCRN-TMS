export interface TalentEffectiveCustomDomainResponse {
  id: string;
  hostname: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent' | string;
  ownerId: string | null;
  ownerDepth?: number | null;
  inherited: boolean;
  selected: boolean;
  customDomainVerified: boolean;
  customDomainSslMode: 'auto' | 'self_hosted' | 'cloudflare' | string;
  routeMode: 'dedicated_talent' | 'scoped_talent_path' | string;
  routePrefix: string | null;
  homepagePath: string;
  marshmallowPath: string;
}

export interface TalentCustomDomainConfigResponse {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: 'auto' | 'self_hosted' | 'cloudflare' | string;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
  domains: TalentEffectiveCustomDomainResponse[];
  inheritedDomains: TalentEffectiveCustomDomainResponse[];
  selectedInheritedDomainIds: string[];
}

export interface SetTalentCustomDomainInput {
  customDomain: string | null;
}

export interface SetTalentCustomDomainResponse {
  customDomain: string | null;
  token: string | null;
  txtRecord: string | null;
}

export interface VerifyTalentCustomDomainResponse {
  verified: boolean;
  message: string;
}

export interface UpdateTalentCustomDomainSslModeInput {
  sslMode: 'auto' | 'self_hosted' | 'cloudflare';
}

export interface UpdateTalentCustomDomainSslModeResponse {
  customDomainSslMode: 'auto' | 'self_hosted' | 'cloudflare' | string;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function buildJsonRequestInit(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export function readTalentCustomDomainConfig(request: RequestFn, talentId: string) {
  return request<TalentCustomDomainConfigResponse>(`/api/v1/talents/${talentId}/custom-domain`);
}

export function setTalentCustomDomain(
  request: RequestFn,
  talentId: string,
  input: SetTalentCustomDomainInput,
) {
  return request<SetTalentCustomDomainResponse>(
    `/api/v1/talents/${talentId}/custom-domain`,
    buildJsonRequestInit('POST', input),
  );
}

export function verifyTalentCustomDomain(request: RequestFn, talentId: string) {
  return request<VerifyTalentCustomDomainResponse>(
    `/api/v1/talents/${talentId}/custom-domain/verify`,
    buildJsonRequestInit('POST', {}),
  );
}

export function updateTalentCustomDomainSslMode(
  request: RequestFn,
  talentId: string,
  input: UpdateTalentCustomDomainSslModeInput,
) {
  return request<UpdateTalentCustomDomainSslModeResponse>(
    `/api/v1/talents/${talentId}/custom-domain/ssl-mode`,
    buildJsonRequestInit('PATCH', input),
  );
}
