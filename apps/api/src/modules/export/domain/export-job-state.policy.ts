// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ExportJobStatus } from '../dto/export.dto';

export const EXPORT_JOB_DOWNLOAD_TTL_DAYS = 7;

export const canCancelExportJob = (status: string): boolean =>
  status === ExportJobStatus.PENDING || status === ExportJobStatus.RUNNING;

export const getExportJobExpiryAt = (now: Date = new Date()): Date => {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + EXPORT_JOB_DOWNLOAD_TTL_DAYS);
  return expiresAt;
};
