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

const DOMAIN_LOOKUP_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string', example: 'aki-home' },
    type: { type: 'string', example: 'homepage' },
    homepagePath: { type: 'string', example: 'aki-home' },
    marshmallowPath: { type: 'string', nullable: true, example: 'aki-mailbox' },
  },
  required: ['path', 'type', 'homepagePath', 'marshmallowPath'],
  example: {
    path: 'aki-home',
    type: 'homepage',
    homepagePath: 'aki-home',
    marshmallowPath: 'aki-mailbox',
  },
};

const DOMAIN_LOOKUP_NOT_FOUND_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'RES_NOT_FOUND' },
        message: { type: 'string', example: 'Domain not found or not verified' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: 'RES_NOT_FOUND',
      message: 'Domain not found or not verified',
    },
  },
};

@ApiTags('Public - Homepage')
@Controller('public/domain-lookup')
export class DomainLookupController {
  constructor(private readonly domainLookupService: DomainLookupService) {}

  /**
   * Lookup a custom domain and return routing information
   * Used by external browser runtimes or edge layers to route custom domain requests
   */
  @Get()
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Lookup custom domain routing' })
  @ApiQuery({ name: 'domain', required: true, description: 'The custom domain to lookup' })
  @ApiResponse({ status: 200, description: 'Domain mapping found', schema: DOMAIN_LOOKUP_SCHEMA })
  @ApiResponse({ status: 404, description: 'Domain not found or not verified', schema: DOMAIN_LOOKUP_NOT_FOUND_SCHEMA })
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
      path: result.homepagePath,
      type: 'homepage',
      homepagePath: result.homepagePath,
      marshmallowPath: result.marshmallowPath,
    };
  }
}
