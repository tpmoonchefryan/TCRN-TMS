import type {
  MfrFilterCriteria,
  PiiPlatformReportCreateResponse,
  ReportCreateResponse,
  ReportFormat,
  ReportJobStatus,
} from '@tcrn/shared';

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
  fileName: string | null;
  fileSizeBytes: number | null;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
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
