// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Queue names (must match worker definitions)
export const QUEUE_NAMES = {
  IMPORT: 'import',
  REPORT: 'report',
  PERMISSION: 'permission',
  MEMBERSHIP_RENEWAL: 'membership-renewal',
  EXPORT: 'export',
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
      { name: QUEUE_NAMES.PERMISSION },
      { name: QUEUE_NAMES.MEMBERSHIP_RENEWAL },
      { name: QUEUE_NAMES.EXPORT },
      { name: QUEUE_NAMES.EMAIL },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
