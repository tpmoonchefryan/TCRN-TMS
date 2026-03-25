// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database';

export interface DomainLookupResult {
  homepagePath: string;
  marshmallowPath: string;
  tenantSchema: string;
  talentId: string;
}

@Injectable()
export class DomainLookupService {
  private readonly logger = new Logger(DomainLookupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Lookup a custom domain and return the routing information
   */
  async lookupDomain(domain: string): Promise<DomainLookupResult | null> {
    this.logger.debug(`[lookupDomain] Looking up domain: "${domain}"`);
    const prisma = this.databaseService.getPrisma();

    // Normalize domain (lowercase, remove trailing dot)
    const normalizedDomain = domain.toLowerCase().replace(/\.$/, '');

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { schemaName: true },
    });

    for (const tenant of tenants) {
      const schema = tenant.schemaName;

      try {
        const results = await prisma.$queryRawUnsafe<Array<{
          talentId: string;
          homepagePath: string | null;
          marshmallowPath: string | null;
          code: string;
        }>>(`
          SELECT
            id as "talentId",
            homepage_path as "homepagePath",
            marshmallow_path as "marshmallowPath",
            LOWER(code) as "code"
          FROM "${schema}".talent
          WHERE LOWER(custom_domain) = $1
            AND custom_domain_verified = true
            AND is_active = true
          LIMIT 1
        `, normalizedDomain);

        if (results.length > 0) {
          const result = results[0];
          const homepagePath = result.homepagePath || result.code;
          const marshmallowPath = result.marshmallowPath || result.code;

          this.logger.debug(
            `[lookupDomain] Found unified domain "${domain}" in schema "${schema}" -> homepage "${homepagePath}", marshmallow "${marshmallowPath}"`,
          );

          return {
            homepagePath,
            marshmallowPath,
            tenantSchema: schema,
            talentId: result.talentId,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(`[lookupDomain] Skipping schema "${schema}" due to lookup error: ${message}`);
      }
    }

    this.logger.debug(`[lookupDomain] No mapping found for domain: "${domain}"`);
    return null;
  }
}
