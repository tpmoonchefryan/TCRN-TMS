// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../queue/queue.module';
import type { SendEmailDto } from '../dto/send-email.dto';
import type { EmailJobData } from '../interfaces/email.interface';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue<EmailJobData>,
    private readonly templateService: EmailTemplateService,
  ) {}

  /**
   * Queue an email for async sending
   */
  async send(dto: SendEmailDto): Promise<{ jobId: string }> {
    // Validate template exists and is active
    const template = await this.templateService.findByCode(dto.templateCode);
    if (!template) {
      throw new NotFoundException(`Email template '${dto.templateCode}' not found`);
    }
    if (!template.isActive) {
      throw new NotFoundException(`Email template '${dto.templateCode}' is not active`);
    }

    // Validate recipient
    if (!dto.recipientPiiId && !dto.recipientEmail) {
      throw new Error('Either recipientPiiId or recipientEmail must be provided');
    }

    // Add job to queue
    const job = await this.emailQueue.add(
      'send-email',
      {
        tenantSchema: dto.tenantSchema,
        templateCode: dto.templateCode,
        recipientPiiId: dto.recipientPiiId || '',
        recipientEmail: dto.recipientEmail,
        locale: dto.locale || 'en',
        variables: dto.variables || {},
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 }, // 24 hours
        removeOnFail: { age: 604800 }, // 7 days
      },
    );

    this.logger.log(
      `Email job queued: ${job.id} (template: ${dto.templateCode}, tenant: ${dto.tenantSchema})`,
    );

    return { jobId: job.id || '' };
  }

  /**
   * Send system notification email (no PII lookup required)
   */
  async sendSystemEmail(
    email: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.send({
      tenantSchema: 'public', // System emails use public schema
      templateCode,
      recipientEmail: email,
      locale,
      variables,
    });
  }

  /**
   * Send business notification email (requires PII lookup)
   */
  async sendBusinessEmail(
    tenantSchema: string,
    recipientPiiId: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.send({
      tenantSchema,
      templateCode,
      recipientPiiId,
      locale,
      variables,
    });
  }
}
