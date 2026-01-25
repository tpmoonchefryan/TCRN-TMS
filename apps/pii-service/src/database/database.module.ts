// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '.prisma/pii-client';

@Global()
@Module({
  providers: [
    {
      provide: 'PII_PRISMA',
      useFactory: () => {
        const prisma = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
        });
        return prisma;
      },
    },
  ],
  exports: ['PII_PRISMA'],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
