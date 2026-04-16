// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  customerImportApi,
  type CustomerImportJobCreateResponse,
  type CustomerImportJobResponse,
} from '@/lib/api/modules/customer';

export type CustomerImportType = 'individuals' | 'companies';

export interface CustomerImportJobSummary {
  id: string;
  talentId: string;
  status: CustomerImportJobResponse['status'];
  fileName: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export function toCustomerImportJobSummary(
  talentId: string,
  job: CustomerImportJobResponse,
): CustomerImportJobSummary {
  return {
    id: job.id,
    talentId,
    status: job.status,
    fileName: job.fileName,
    totalRows: job.progress.totalRows,
    processedRows: job.progress.processedRows,
    successCount: job.progress.successRows,
    errorCount: job.progress.failedRows,
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
  };
}

export function toCreatedCustomerImportJobSummary(
  talentId: string,
  fileName: string,
  job: CustomerImportJobCreateResponse,
): CustomerImportJobSummary {
  return {
    id: job.id,
    talentId,
    status: job.status,
    fileName: job.fileName || fileName,
    totalRows: job.totalRows,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    createdAt: job.createdAt,
  };
}

export const customerImportDomainApi = {
  downloadTemplate: async (type: CustomerImportType, talentId: string) => {
    if (type === 'individuals') {
      await customerImportApi.downloadIndividualTemplate(talentId);
      return;
    }

    await customerImportApi.downloadCompanyTemplate(talentId);
  },

  uploadFile: async (type: CustomerImportType, file: File, talentId: string) => {
    if (type === 'individuals') {
      return customerImportApi.uploadIndividual(file, talentId);
    }

    return customerImportApi.uploadCompany(file, talentId);
  },

  getJob: async (type: CustomerImportType, jobId: string, talentId: string) => {
    return customerImportApi.getJob(type, jobId, talentId);
  },

  downloadErrors: async (type: CustomerImportType, jobId: string, talentId: string) => {
    return customerImportApi.downloadErrors(type, jobId, talentId);
  },
};
