// SPDX-License-Identifier: Apache-2.0
import { ImportJobStatus } from '../dto/import.dto';

export const canCancelImportJob = (status: string): boolean =>
  status === ImportJobStatus.PENDING || status === ImportJobStatus.RUNNING;

export const resolveImportJobCompletionStatus = (
  successRows: number,
  failedRows: number
): ImportJobStatus => {
  if (failedRows === 0) {
    return ImportJobStatus.SUCCESS;
  }

  if (successRows === 0) {
    return ImportJobStatus.FAILED;
  }

  return ImportJobStatus.PARTIAL;
};
