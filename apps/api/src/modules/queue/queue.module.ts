// SPDX-License-Identifier: Apache-2.0
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Queue names (must match worker definitions)
export const QUEUE_NAMES = {
  IMPORT: 'import',
  REPORT: 'report',
  MEMBERSHIP_RENEWAL: 'membership-renewal',
  LOG: 'log',
  LOG_CLEANUP: 'log-cleanup',
  EXPORT: 'export',
  MARSHMALLOW_EXPORT: 'marshmallow-export',
  EMAIL: 'email',
} as const;

@Global()
@Module({
  imports: [
    // Register BullMQ with Redis connection
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),
    // Register individual queues
    BullModule.registerQueue(
      { name: QUEUE_NAMES.IMPORT },
      { name: QUEUE_NAMES.REPORT },
      { name: QUEUE_NAMES.MEMBERSHIP_RENEWAL },
      { name: QUEUE_NAMES.LOG },
      { name: QUEUE_NAMES.LOG_CLEANUP },
      { name: QUEUE_NAMES.EXPORT },
      { name: QUEUE_NAMES.MARSHMALLOW_EXPORT },
      { name: QUEUE_NAMES.EMAIL }
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
