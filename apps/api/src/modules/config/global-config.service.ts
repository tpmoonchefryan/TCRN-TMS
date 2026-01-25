// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database';

export interface GlobalConfigValue {
  key: string;
  value: unknown;
  description?: string | null;
}

@Injectable()
export class GlobalConfigService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get a global config by key
   */
  async get(key: string): Promise<GlobalConfigValue | null> {
    const prisma = this.db.getPrisma();
    const config = await prisma.globalConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return null;
    }

    return {
      key: config.key,
      value: config.value,
      description: config.description,
    };
  }

  /**
   * Set a global config value
   * Creates if not exists, updates if exists
   */
  async set(key: string, value: unknown, description?: string): Promise<GlobalConfigValue> {
    const prisma = this.db.getPrisma();

    const config = await prisma.globalConfig.upsert({
      where: { key },
      update: {
        value: value as any,
        description,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value as any,
        description,
      },
    });

    return {
      key: config.key,
      value: config.value,
      description: config.description,
    };
  }

  /**
   * Get system base domain for external pages
   * Returns the configured domain or default 'tcrn.app'
   */
  async getSystemBaseDomain(): Promise<string> {
    const config = await this.get('system.baseDomain');
    if (config && config.value && typeof config.value === 'object') {
      const domainConfig = config.value as { domain?: string };
      return domainConfig.domain || 'tcrn.app';
    }
    return 'tcrn.app';
  }

  /**
   * Set system base domain for external pages
   */
  async setSystemBaseDomain(domain: string): Promise<GlobalConfigValue> {
    return this.set(
      'system.baseDomain',
      { domain },
      'Base domain for system subdomains (e.g., tcrn.app)'
    );
  }

  /**
   * Get all global configs (for admin panel)
   */
  async getAll(): Promise<GlobalConfigValue[]> {
    const prisma = this.db.getPrisma();
    const configs = await prisma.globalConfig.findMany({
      orderBy: { key: 'asc' },
    });

    return configs.map(config => ({
      key: config.key,
      value: config.value,
      description: config.description,
    }));
  }
}
