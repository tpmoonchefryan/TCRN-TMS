// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';

import { Public } from '../../../common/decorators';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { DomainLookupService } from '../services/domain-lookup.service';

@ApiTags('Domain Lookup')
@Controller('public/domain-lookup')
export class DomainLookupController {
  constructor(private readonly domainLookupService: DomainLookupService) {}

  /**
   * Lookup a custom domain and return routing information
   * Used by the frontend middleware to route custom domain requests
   */
  @Get()
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Lookup custom domain routing' })
  @ApiQuery({ name: 'domain', required: true, description: 'The custom domain to lookup' })
  @ApiResponse({ status: 200, description: 'Domain mapping found' })
  @ApiResponse({ status: 404, description: 'Domain not found or not verified' })
  async lookupDomain(@Query('domain') domain: string) {
    if (!domain || domain.trim().length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Domain parameter is required',
      });
    }

    const result = await this.domainLookupService.lookupDomain(domain.trim());

    if (!result) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Domain not found or not verified',
      });
    }

    return {
      path: result.path,
      type: result.type,
    };
  }
}
