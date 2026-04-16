// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ImportJobStatus } from '../dto/import.dto';

export const canCancelImportJob = (status: string): boolean =>
  status === ImportJobStatus.PENDING || status === ImportJobStatus.RUNNING;

export const resolveImportJobCompletionStatus = (
  successRows: number,
  failedRows: number,
): ImportJobStatus => {
  if (failedRows === 0) {
    return ImportJobStatus.SUCCESS;
  }

  if (successRows === 0) {
    return ImportJobStatus.FAILED;
  }

  return ImportJobStatus.PARTIAL;
};
