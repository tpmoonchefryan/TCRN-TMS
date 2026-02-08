// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Logger, Module, OnModuleDestroy,OnModuleInit } from '@nestjs/common';
import { disconnectPrisma,prisma } from '@tcrn/database';

import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: 'PRISMA_CLIENT',
      useValue: prisma,
    },
  ],
  exports: [DatabaseService, 'PRISMA_CLIENT'],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  async onModuleInit() {
    this.logger.log('Database module initialized');
  }

  async onModuleDestroy() {
    await disconnectPrisma();
    this.logger.log('Database connection closed');
  }
}
