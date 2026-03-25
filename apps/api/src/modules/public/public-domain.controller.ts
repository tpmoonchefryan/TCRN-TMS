// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Logger, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { success } from '../../common/response.util';
import { DomainLookupService } from '../homepage/services/domain-lookup.service';

/**
 * Public controller for custom domain lookups.
 * Used by the frontend middleware to route custom domain requests.
 */
@ApiTags('Public - Domain')
@Controller('public')
export class PublicDomainController {
  private readonly logger = new Logger(PublicDomainController.name);

  constructor(private readonly domainLookupService: DomainLookupService) {}

  @Public()
  @Get('domain-lookup/:hostname')
  @ApiOperation({ 
    summary: 'Lookup custom domain configuration',
    description: 'Returns talent path and service paths for a verified custom domain. Used by frontend middleware for routing.'
  })
  async lookupDomain(@Param('hostname') hostname: string) {
    const normalizedHost = hostname.toLowerCase().trim();

    this.logger.debug(`Looking up custom domain: ${normalizedHost}`);

    const result = await this.domainLookupService.lookupDomain(normalizedHost);

    if (result) {
      this.logger.log(`Found custom domain ${normalizedHost} -> ${result.homepagePath}`);

      return success({
        talentPath: result.homepagePath,
        homepagePath: result.homepagePath,
        marshmallowPath: result.marshmallowPath,
      });
    }

    this.logger.debug(`Custom domain not found: ${normalizedHost}`);
    throw new NotFoundException('Custom domain not found or not verified');
  }
}
