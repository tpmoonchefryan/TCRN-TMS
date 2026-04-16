// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import {
  type DomainLookupResult,
  normalizeLookupDomain,
  resolveLookupRoute,
} from '../domain/public-homepage-read.policy';
import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';

export type { DomainLookupResult } from '../domain/public-homepage-read.policy';

@Injectable()
export class DomainLookupService {
  private readonly logger = new Logger(DomainLookupService.name);

  constructor(
    private readonly publicHomepageReadRepository: PublicHomepageReadRepository,
  ) {}

  async lookupDomain(domain: string): Promise<DomainLookupResult | null> {
    this.logger.debug(`[lookupDomain] Looking up domain: "${domain}"`);
    const normalizedDomain = normalizeLookupDomain(domain);
    const tenantSchemas = await this.publicHomepageReadRepository.listActiveTenantSchemas();

    for (const schema of tenantSchemas) {
      try {
        const route = await this.publicHomepageReadRepository.findVerifiedDomainRoute(
          schema,
          normalizedDomain,
        );

        if (route) {
          const result = resolveLookupRoute(route, schema);

          this.logger.debug(
            `[lookupDomain] Found unified domain "${domain}" in schema "${schema}" -> homepage "${result.homepagePath}", marshmallow "${result.marshmallowPath}"`,
          );

          return result;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(
          `[lookupDomain] Skipping schema "${schema}" due to lookup error: ${message}`,
        );
      }
    }

    this.logger.debug(`[lookupDomain] No mapping found for domain: "${domain}"`);
    return null;
  }
}
