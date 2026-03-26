// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  customerExportJobProcessor,
  marshmallowExportJobProcessor,
} = vi.hoisted(() => ({
  customerExportJobProcessor: vi.fn(),
  marshmallowExportJobProcessor: vi.fn(),
}));

vi.mock('../customer-export.job', () => ({
  customerExportJobProcessor,
}));

vi.mock('../marshmallow-export.job', () => ({
  marshmallowExportJobProcessor,
}));

import { exportJobProcessor } from '../export.job';

describe('exportJobProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['customer_export', 'process-export'])(
    'routes %s to the customer export processor',
    async (jobName) => {
      customerExportJobProcessor.mockResolvedValueOnce({ kind: 'customer' });

      const result = await exportJobProcessor({ name: jobName } as Job);

      expect(customerExportJobProcessor).toHaveBeenCalledTimes(1);
      expect(marshmallowExportJobProcessor).not.toHaveBeenCalled();
      expect(result).toEqual({ kind: 'customer' });
    },
  );

  it.each(['marshmallow_export', 'marshmallow-export'])(
    'routes %s to the marshmallow export processor',
    async (jobName) => {
      marshmallowExportJobProcessor.mockResolvedValueOnce({ kind: 'marshmallow' });

      const result = await exportJobProcessor({ name: jobName } as Job);

      expect(marshmallowExportJobProcessor).toHaveBeenCalledTimes(1);
      expect(customerExportJobProcessor).not.toHaveBeenCalled();
      expect(result).toEqual({ kind: 'marshmallow' });
    },
  );

  it('rejects unknown export job names', async () => {
    await expect(exportJobProcessor({ name: 'unknown-export' } as Job)).rejects.toThrow(
      'Unknown export job type: unknown-export',
    );
  });
});
