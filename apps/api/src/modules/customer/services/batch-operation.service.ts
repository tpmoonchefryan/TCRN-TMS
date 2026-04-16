// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { BatchOperationApplicationService } from '../application/batch-operation.service';
import type {
  BatchOperationDto,
  BatchOperationResultDto,
} from '../dto/customer.dto';

@Injectable()
export class BatchOperationService {
  constructor(
    private readonly batchOperationApplicationService: BatchOperationApplicationService,
  ) {}

  executeBatch(
    talentId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<BatchOperationResultDto | { jobId: string; message: string }> {
    return this.batchOperationApplicationService.executeBatch(talentId, dto, context);
  }
}
