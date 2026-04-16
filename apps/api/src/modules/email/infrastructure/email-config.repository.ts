// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  EMAIL_CONFIG_KEY,
  normalizeStoredEmailConfig,
  type StoredEmailConfig,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';

export interface StoredEmailConfigRecord {
  value: StoredEmailConfig;
  updatedAt: Date;
}

@Injectable()
export class EmailConfigRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findStoredConfig(): Promise<StoredEmailConfigRecord | null> {
    const config = await this.prisma.globalConfig.findUnique({
      where: { key: EMAIL_CONFIG_KEY },
    });

    if (!config?.value) {
      return null;
    }

    return {
      value: normalizeStoredEmailConfig(config.value),
      updatedAt: config.updatedAt,
    };
  }

  async saveStoredConfig(value: StoredEmailConfig): Promise<void> {
    await this.prisma.globalConfig.upsert({
      where: { key: EMAIL_CONFIG_KEY },
      update: {
        value: value as Prisma.InputJsonObject,
        updatedAt: new Date(),
        description: 'Email provider configuration',
      },
      create: {
        key: EMAIL_CONFIG_KEY,
        value: value as Prisma.InputJsonObject,
        description: 'Email provider configuration',
      },
    });
  }
}
