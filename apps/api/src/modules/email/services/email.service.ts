// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '../../queue/queue.module';
import { EmailDispatchApplicationService } from '../application/email-dispatch.service';
import type { SendEmailDto } from '../dto/send-email.dto';
import { EmailQueueGateway } from '../infrastructure/email-queue.gateway';
import type { EmailJobData } from '../interfaces/email.interface';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) emailQueue: Queue<EmailJobData>,
    templateService: EmailTemplateService,
    private readonly emailDispatchApplicationService: EmailDispatchApplicationService = new EmailDispatchApplicationService(
      new EmailQueueGateway(emailQueue),
      templateService,
    ),
  ) {}

  async send(dto: SendEmailDto): Promise<{ jobId: string }> {
    return this.emailDispatchApplicationService.send(dto);
  }

  async sendSystemEmail(
    email: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.emailDispatchApplicationService.sendSystemEmail(
      email,
      templateCode,
      locale,
      variables,
    );
  }

  async sendBusinessEmail(
    tenantSchema: string,
    recipientEmail: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.emailDispatchApplicationService.sendBusinessEmail(
      tenantSchema,
      recipientEmail,
      templateCode,
      locale,
      variables,
    );
  }
}
