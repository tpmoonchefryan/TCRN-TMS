import type {
  MfrFilterCriteria,
  PiiPlatformReportCreateResponse,
  ReportCatalogItem,
  ReportConfigFilterOptionSource,
  ReportCreateResponse,
  ReportDictionaryFilterOptionSource,
  ReportFilterField,
  ReportFilterSchema,
  ReportFormat,
  ReportJobStatus,
  ReportLocalizedText,
  ReportType,
} from '@tcrn/shared';

export type {
  ReportCatalogItem,
  ReportFilterField,
  ReportFilterSchema,
  ReportLocalizedText,
  ReportType,
};

export interface MfrPreviewRow {
  nickname: string | null;
  platformName: string;
  membershipLevelName: string;
  validFrom: string;
  validTo: string | null;
  statusName: string;
}

export interface MfrSearchResult {
  totalCount: number;
  preview: MfrPreviewRow[];
  filterSummary: {
    platforms: string[];
    dateRange: string | null;
    includeExpired: boolean;
  };
}

export interface ReportJobListItem {
  id: string;
  reportType: string;
  status: ReportJobStatus;
  totalRows: number | null;
  fileName: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface ReportJobListResponse {
  items: ReportJobListItem[];
  meta: {
    total: number;
  };
}

export interface ReportJobResponse {
  id: string;
  reportType: string;
  status: ReportJobStatus;
  progress: {
    totalRows: number | null;
    processedRows: number;
    percentage: number;
  };
  error?: {
    code: string;
    message: string;
  };
  failureReason: string | null;
  parameterSnapshot: {
    reportType: ReportType;
    format: ReportFormat;
    requestedAt: string | null;
    filters: Record<string, unknown>;
  };
  timeline: Array<{
    phase: 'queued' | 'started' | 'completed' | 'downloaded' | 'expired';
    at: string | null;
  }>;
  artifacts: Array<{
    kind: 'report-file';
    downloadState: 'available' | 'consumed' | 'expired' | 'unavailable';
    fileName: string | null;
    fileSizeBytes: number | null;
    expiresAt: string | null;
    downloadedAt: string | null;
  }>;
  fileName: string | null;
  fileSizeBytes: number | null;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  downloadedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface ReportDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
  fileName: string | null;
}

export interface ReportCancelResponse {
  id: string;
  status: ReportJobStatus;
}

export type ReportPortalHandoff = PiiPlatformReportCreateResponse;

export interface ReportCatalogResponse {
  items: ReportCatalogItem[];
}

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFilterOptionResponse {
  options: ReportFilterOption[];
}

interface ConfigEntityOptionRecord {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}

interface MembershipLevelOptionRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface MembershipTypeOptionRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  levels: MembershipLevelOptionRecord[];
}

interface MembershipClassOptionRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  types: MembershipTypeOptionRecord[];
}

interface ListMfrJobsOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface SearchMfrOptions {
  filters?: MfrFilterCriteria;
  previewLimit?: number;
}

interface CreateMfrJobInput {
  filters?: MfrFilterCriteria;
  format?: ReportFormat;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

const CONFIG_ENTITY_OPTION_PAGE_SIZE = 100;
const MAX_CONFIG_ENTITY_OPTION_PAGES = 100;

function buildQueryString(input: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapConfigEntityOptions(items: ConfigEntityOptionRecord[]): ReportFilterOption[] {
  return items
    .filter((item) => item.isActive && item.code)
    .map((item) => ({
      value: item.code ?? '',
      label: item.name,
    }));
}

async function listAllConfigEntityOptions(
  request: RequestFn,
  source: ReportConfigFilterOptionSource,
  talentId: string,
): Promise<ReportFilterOption[]> {
  const items: ConfigEntityOptionRecord[] = [];

  for (let page = 1; page <= MAX_CONFIG_ENTITY_OPTION_PAGES; page += 1) {
    const batch = await request<ConfigEntityOptionRecord[]>(
      `/api/v1/configuration-entity/${source.entityType}${buildQueryString({
        scopeType: 'talent',
        scopeId: talentId,
        includeInherited: true,
        includeDisabled: false,
        includeInactive: false,
        page,
        pageSize: CONFIG_ENTITY_OPTION_PAGE_SIZE,
        sort: 'sortOrder',
      })}`,
    );

    items.push(...batch);

    if (batch.length < CONFIG_ENTITY_OPTION_PAGE_SIZE) {
      break;
    }
  }

  return mapConfigEntityOptions(items);
}

async function listMembershipFilterOptions(
  request: RequestFn,
  source: ReportConfigFilterOptionSource,
  talentId: string,
): Promise<ReportFilterOption[]> {
  const tree = await request<MembershipClassOptionRecord[]>(
    `/api/v1/configuration-entity/membership-tree${buildQueryString({
      scopeType: 'talent',
      scopeId: talentId,
      includeInactive: false,
    })}`,
  );

  if (source.entityType === 'membership-class') {
    return tree
      .filter((item) => item.isActive)
      .map((item) => ({
        value: item.code,
        label: item.name,
      }));
  }

  if (source.entityType === 'membership-type') {
    return tree.flatMap((membershipClass) =>
      membershipClass.types
        .filter((item) => item.isActive)
        .map((item) => ({
          value: item.code,
          label: `${membershipClass.name} / ${item.name}`,
        })),
    );
  }

  if (source.entityType === 'membership-level') {
    return tree.flatMap((membershipClass) =>
      membershipClass.types.flatMap((membershipType) =>
        membershipType.levels
          .filter((item) => item.isActive)
          .map((item) => ({
            value: item.code,
            label: `${membershipClass.name} / ${membershipType.name} / ${item.name}`,
          })),
      ),
    );
  }

  return [];
}

export function searchMfr(
  request: RequestFn,
  talentId: string,
  options: SearchMfrOptions = {},
) {
  return request<MfrSearchResult>('/api/v1/reports/mfr/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      talentId,
      filters: options.filters,
      previewLimit: options.previewLimit ?? 8,
    }),
  });
}

export function listReportCatalog(request: RequestFn) {
  return request<ReportCatalogResponse>('/api/v1/reports/catalog');
}

export async function listReportConfigFilterOptions(
  request: RequestFn,
  source: ReportConfigFilterOptionSource,
  talentId: string,
): Promise<ReportFilterOptionResponse> {
  const options = source.entityType === 'membership-class'
    || source.entityType === 'membership-type'
    || source.entityType === 'membership-level'
    ? await listMembershipFilterOptions(request, source, talentId)
    : await listAllConfigEntityOptions(request, source, talentId);

  return {
    options,
  };
}

export async function listReportDictionaryFilterOptions(
  request: RequestFn,
  source: ReportDictionaryFilterOptionSource,
): Promise<ReportFilterOptionResponse> {
  const items = await request<Array<{ code: string; name: string; isActive: boolean }>>(
    `/api/v1/system-dictionary/${encodeURIComponent(source.dictionaryCode)}${buildQueryString({
      includeInactive: false,
      page: 1,
      pageSize: CONFIG_ENTITY_OPTION_PAGE_SIZE,
    })}`,
  );

  return {
    options: items
      .filter((item) => item.isActive)
      .map((item) => ({
        value: item.code,
        label: item.name,
      })),
  };
}

export function createMfrJob(
  request: RequestFn,
  talentId: string,
  input: CreateMfrJobInput = {},
) {
  return request<ReportCreateResponse>('/api/v1/reports/mfr/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      talentId,
      filters: input.filters,
      format: input.format ?? 'xlsx',
    }),
  });
}

export function listMfrJobs(
  request: RequestFn,
  talentId: string,
  options: ListMfrJobsOptions = {},
) {
  const query = buildQueryString({
    talentId,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
    status: options.status,
    createdFrom: options.createdFrom,
    createdTo: options.createdTo,
  });

  return request<ReportJobListResponse>(`/api/v1/reports/mfr/jobs${query}`);
}

export function readMfrJob(request: RequestFn, talentId: string, jobId: string) {
  const query = buildQueryString({
    talent_id: talentId,
  });

  return request<ReportJobResponse>(`/api/v1/reports/mfr/jobs/${jobId}${query}`);
}

export function downloadMfrJob(request: RequestFn, talentId: string, jobId: string) {
  const query = buildQueryString({
    talent_id: talentId,
  });

  return request<ReportDownloadResponse>(`/api/v1/reports/mfr/jobs/${jobId}/download${query}`);
}

export function cancelMfrJob(request: RequestFn, talentId: string, jobId: string) {
  const query = buildQueryString({
    talent_id: talentId,
  });

  return request<ReportCancelResponse>(`/api/v1/reports/mfr/jobs/${jobId}${query}`, {
    method: 'DELETE',
  });
}
