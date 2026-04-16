// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../queue';
import {
  buildEmailJobOptions,
  EMAIL_JOB_NAME,
} from '../domain/email-dispatch.policy';
import type { EmailJobData } from '../interfaces/email.interface';

@Injectable()
export class EmailQueueGateway {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  async enqueue(jobData: EmailJobData): Promise<{ jobId: string }> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAME,
      jobData,
      buildEmailJobOptions(),
    );

    return {
      jobId: job.id ? String(job.id) : '',
    };
  }
}
