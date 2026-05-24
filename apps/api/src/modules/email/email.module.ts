// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database';
import { QUEUE_NAMES } from '../queue/queue.module';
import { EmailConfigApplicationService } from './application/email-config.service';
import { EmailDispatchApplicationService } from './application/email-dispatch.service';
import { TenantSendingDomainService } from './application/tenant-sending-domain.service';
import { EmailConfigController } from './controllers/email-config.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { TenantSendingDomainController } from './controllers/tenant-sending-domain.controller';
import { EmailConfigCryptoService } from './infrastructure/email-config-crypto.service';
import { EmailConfigRepository } from './infrastructure/email-config.repository';
import { EmailQueueGateway } from './infrastructure/email-queue.gateway';
import { EmailTemplateRepository } from './infrastructure/email-template.repository';
import { TenantSendingDomainRepository } from './infrastructure/tenant-sending-domain.repository';
import { EmailConfigService } from './services/email-config.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailService } from './services/email.service';
import { SmtpClient } from './services/smtp.client';
import { TencentSesClient } from './services/tencent-ses.client';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAIL,
    }),
  ],
  controllers: [EmailConfigController, EmailTemplateController, TenantSendingDomainController],
  providers: [
    EmailConfigService,
    EmailConfigApplicationService,
    EmailConfigCryptoService,
    EmailConfigRepository,
    EmailDispatchApplicationService,
    EmailQueueGateway,
    EmailService,
    EmailTemplateRepository,
    EmailTemplateService,
    TenantSendingDomainRepository,
    TenantSendingDomainService,
    SmtpClient,
    TencentSesClient,
  ],
  exports: [EmailConfigService, EmailService, EmailTemplateService, SmtpClient, TencentSesClient],
})
export class EmailModule {}
