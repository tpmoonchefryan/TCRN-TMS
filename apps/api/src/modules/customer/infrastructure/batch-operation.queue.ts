// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../queue';
import {
  type BatchOperationQueuePayload,
  CUSTOMER_BATCH_QUEUE_JOB_NAME,
} from '../domain/batch-operation.policy';

@Injectable()
export class BatchOperationQueueGateway {
  constructor(
    @InjectQueue(QUEUE_NAMES.IMPORT) private readonly batchQueue: Queue,
  ) {}

  async enqueue(payload: BatchOperationQueuePayload): Promise<string> {
    const job = await this.batchQueue.add(CUSTOMER_BATCH_QUEUE_JOB_NAME, payload);
    return job.id || 'unknown';
  }
}
