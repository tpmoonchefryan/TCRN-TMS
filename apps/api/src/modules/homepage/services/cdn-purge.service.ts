// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * CDN Cache Purge Service
 * Handles cache invalidation for published homepages
 */
@Injectable()
export class CdnPurgeService {
  private readonly logger = new Logger(CdnPurgeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Purge homepage cache
   */
  async purgeHomepage(homepagePath: string, customDomain?: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    const urls = [
      `${appUrl}/p/${homepagePath}`,
      `${appUrl}/api/v1/public/homepage/${homepagePath}`,
    ];

    if (customDomain) {
      urls.push(`https://${customDomain}/`);
    }

    await this.purgeUrls(urls);
  }

  /**
   * Purge specific URLs via Cloudflare API
   */
  private async purgeUrls(urls: string[]): Promise<void> {
    const zoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID');
    const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

    if (!zoneId || !apiToken) {
      this.logger.warn('Cloudflare not configured, skipping cache purge');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
          { files: urls },
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`CDN cache purged for: ${urls.join(', ')}`);
    } catch (error) {
      this.logger.error('CDN purge failed:', error);
      throw error;
    }
  }

  /**
   * Purge all cache for a zone (use sparingly)
   */
  async purgeAll(): Promise<void> {
    const zoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID');
    const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

    if (!zoneId || !apiToken) {
      this.logger.warn('Cloudflare not configured, skipping cache purge');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
          { purge_everything: true },
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log('CDN cache purged (all)');
    } catch (error) {
      this.logger.error('CDN purge (all) failed:', error);
      throw error;
    }
  }
}
