// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  buildBusinessEmailDto,
  buildEmailJobData,
  buildSystemEmailDto,
  canDispatchEmailTemplate,
  hasEmailDispatchRecipient,
} from '../domain/email-dispatch.policy';
import type { SendEmailDto } from '../dto/send-email.dto';
import { EmailQueueGateway } from '../infrastructure/email-queue.gateway';
import { EmailTemplateApplicationService } from './email-template.service';

@Injectable()
export class EmailDispatchApplicationService {
  private readonly logger = new Logger(EmailDispatchApplicationService.name);

  constructor(
    private readonly emailQueueGateway: EmailQueueGateway,
    private readonly emailTemplateService: EmailTemplateApplicationService,
  ) {}

  async send(dto: SendEmailDto): Promise<{ jobId: string }> {
    const template = await this.emailTemplateService.findByCode(dto.templateCode);

    if (!template) {
      throw new NotFoundException(`Email template '${dto.templateCode}' not found`);
    }

    if (!canDispatchEmailTemplate(template)) {
      throw new NotFoundException(`Email template '${dto.templateCode}' is not active`);
    }

    if (!hasEmailDispatchRecipient(dto)) {
      throw new Error('recipientEmail must be provided');
    }

    const result = await this.emailQueueGateway.enqueue(buildEmailJobData(dto));

    this.logger.log(
      `Email job queued: ${result.jobId} (template: ${dto.templateCode}, tenant: ${dto.tenantSchema})`,
    );

    return result;
  }

  async sendSystemEmail(
    email: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.send(buildSystemEmailDto(email, templateCode, locale, variables));
  }

  async sendBusinessEmail(
    tenantSchema: string,
    recipientEmail: string,
    templateCode: string,
    locale: string = 'en',
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string }> {
    return this.send(
      buildBusinessEmailDto(
        tenantSchema,
        recipientEmail,
        templateCode,
        locale,
        variables,
      ),
    );
  }
}
