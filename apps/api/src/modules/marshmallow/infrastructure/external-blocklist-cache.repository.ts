// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../redis';
import {
  EXTERNAL_BLOCKLIST_CACHE_KEY_PATTERN,
  EXTERNAL_BLOCKLIST_CACHE_KEY_PREFIX,
} from '../domain/external-blocklist.policy';
import { OwnerType } from '../dto/external-blocklist.dto';

@Injectable()
export class ExternalBlocklistCacheRepository {
  constructor(private readonly redisService: RedisService) {}

  async clearForOwner(
    ownerType: OwnerType,
    ownerId: string | null | undefined,
  ): Promise<void> {
    if (ownerType === OwnerType.TALENT && ownerId) {
      await this.redisService.del(`${EXTERNAL_BLOCKLIST_CACHE_KEY_PREFIX}${ownerId}`);
      return;
    }

    if (ownerType === OwnerType.TENANT || ownerType === OwnerType.SUBSIDIARY) {
      await this.clearAll();
    }
  }

  async clearAll(): Promise<void> {
    const keys = await this.redisService.keys(EXTERNAL_BLOCKLIST_CACHE_KEY_PATTERN);
    if (keys.length === 0) {
      return;
    }

    await Promise.all(keys.map((key) => this.redisService.del(key)));
  }
}
