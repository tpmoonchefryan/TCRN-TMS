// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job, Processor } from 'bullmq';

import { customerExportJobProcessor } from './customer-export.job';
import { marshmallowExportJobProcessor } from './marshmallow-export.job';

export const exportJobProcessor: Processor = async (job: Job) => {
  switch (job.name) {
    case 'customer_export':
    case 'process-export':
      return customerExportJobProcessor(job as Parameters<typeof customerExportJobProcessor>[0]);
    case 'marshmallow_export':
    case 'marshmallow-export':
      return marshmallowExportJobProcessor(job as Parameters<typeof marshmallowExportJobProcessor>[0]);
    default:
      throw new Error(`Unknown export job type: ${job.name}`);
  }
};
