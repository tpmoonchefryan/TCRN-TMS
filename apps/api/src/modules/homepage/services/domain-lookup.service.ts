// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database';

export interface DomainLookupResult {
  path: string;
  type: 'homepage' | 'marshmallow';
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

    // Get all active tenants
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    for (const tenant of tenants) {
      const schema = tenant.schemaName;

      // 1. Check TalentHomepage for custom domain
      const homepageResult = await prisma.$queryRawUnsafe<Array<{
        talentId: string;
        path: string;
      }>>(`
        SELECT 
          th.talent_id as "talentId",
          COALESCE(t.homepage_path, t.code) as "path"
        FROM "${schema}".talent_homepage th
        JOIN "${schema}".talent t ON t.id = th.talent_id
        WHERE LOWER(th.custom_domain) = $1
          AND th.custom_domain_verified = true
          AND th.is_published = true
          AND t.is_active = true
      `, normalizedDomain);

      if (homepageResult.length > 0) {
        this.logger.debug(`[lookupDomain] Found homepage for domain: "${domain}" in schema: "${schema}"`);
        return {
          path: homepageResult[0].path,
          type: 'homepage',
          tenantSchema: schema,
          talentId: homepageResult[0].talentId,
        };
      }

      // 2. Check MarshmallowConfig for custom domain
      const marshmallowResult = await prisma.$queryRawUnsafe<Array<{
        talentId: string;
        path: string;
      }>>(`
        SELECT 
          mc.talent_id as "talentId",
          COALESCE(mc.path, t.code) as "path"
        FROM "${schema}".marshmallow_config mc
        JOIN "${schema}".talent t ON t.id = mc.talent_id
        WHERE LOWER(mc.custom_domain) = $1
          AND mc.custom_domain_verified = true
          AND mc.is_enabled = true
          AND t.is_active = true
      `, normalizedDomain);

      if (marshmallowResult.length > 0) {
        this.logger.debug(`[lookupDomain] Found marshmallow for domain: "${domain}" in schema: "${schema}"`);
        return {
          path: marshmallowResult[0].path,
          type: 'marshmallow',
          tenantSchema: schema,
          talentId: marshmallowResult[0].talentId,
        };
      }
    }

    this.logger.debug(`[lookupDomain] No mapping found for domain: "${domain}"`);
    return null;
  }
}
