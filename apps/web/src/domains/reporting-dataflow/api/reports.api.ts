// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  reportApi,
  type ReportFilters,
  type ReportFormat,
  type ReportJobListItemRecord,
} from '@/lib/api/modules/content';

export type ReportingJobRecord = ReportJobListItemRecord;

export const reportingDataflowDomainApi = {
  listJobs: (talentId: string) => reportApi.list(talentId),
  createJob: (params: { talentId: string; filters: ReportFilters; format?: ReportFormat }) =>
    reportApi.create(params),
  getDownloadUrl: (jobId: string, talentId: string) => reportApi.getDownloadUrl(jobId, talentId),
  cancelJob: (jobId: string, talentId: string) => reportApi.cancel(jobId, talentId),
};
