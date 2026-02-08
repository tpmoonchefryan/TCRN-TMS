// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Logger, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { prisma } from '@tcrn/database';

import { Public } from '../../common/decorators/public.decorator';
import { success } from '../../common/response.util';

/**
 * Public controller for custom domain lookups.
 * Used by the frontend middleware to route custom domain requests.
 */
@ApiTags('Public - Domain')
@Controller('api/v1/public')
export class PublicDomainController {
  private readonly logger = new Logger(PublicDomainController.name);

  @Public()
  @Get('domain-lookup/:hostname')
  @ApiOperation({ 
    summary: 'Lookup custom domain configuration',
    description: 'Returns talent path and service paths for a verified custom domain. Used by frontend middleware for routing.'
  })
  async lookupDomain(@Param('hostname') hostname: string) {
    const normalizedHost = hostname.toLowerCase().trim();
    
    this.logger.debug(`Looking up custom domain: ${normalizedHost}`);
    
    // Search across all tenant schemas for the custom domain
    // This uses a union query across all tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        const results = await prisma.$queryRawUnsafe<Array<{
          homepagePath: string;
          marshmallowPath: string | null;
          code: string;
        }>>(`
          SELECT 
            homepage_path as "homepagePath",
            marshmallow_path as "marshmallowPath",
            code
          FROM "${tenant.schemaName}".talent
          WHERE custom_domain = $1
            AND custom_domain_verified = true
          LIMIT 1
        `, normalizedHost);

        if (results.length > 0) {
          const talent = results[0];
          this.logger.log(`Found custom domain ${normalizedHost} -> ${talent.homepagePath}`);
          
          return success({
            talentPath: talent.homepagePath || talent.code.toLowerCase(),
            homepagePath: talent.homepagePath || talent.code.toLowerCase(),
            marshmallowPath: talent.marshmallowPath || talent.code.toLowerCase(),
          });
        }
      } catch (error) {
        // Schema might not have the custom_domain column yet - skip
        this.logger.debug(`Schema ${tenant.schemaName} lookup failed: ${error.message}`);
      }
    }

    this.logger.debug(`Custom domain not found: ${normalizedHost}`);
    throw new NotFoundException('Custom domain not found or not verified');
  }
}
