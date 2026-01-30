// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database';
import { QUEUE_NAMES } from '../queue/queue.module';

import { EmailConfigController } from './controllers/email-config.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
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
  controllers: [EmailConfigController, EmailTemplateController],
  providers: [EmailConfigService, EmailService, EmailTemplateService, SmtpClient, TencentSesClient],
  exports: [EmailConfigService, EmailService, EmailTemplateService, SmtpClient, TencentSesClient],
})
export class EmailModule {}
