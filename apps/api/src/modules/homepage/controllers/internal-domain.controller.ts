// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Internal controller for Caddy on-demand TLS domain verification

import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from '../../../common/decorators';
import { DomainLookupService } from '../services/domain-lookup.service';

/**
 * Internal controller for Caddy on-demand TLS verification
 * This endpoint is called by Caddy to verify if a custom domain should get a certificate
 * 
 * Caddy will request: GET /api/v1/internal/domain-check?domain=example.com
 * - Return 200 if the domain is allowed (verified custom domain)
 * - Return 404 if the domain is not allowed
 */
@ApiExcludeController()
@Controller('internal/domain-check')
export class InternalDomainController {
  constructor(private readonly domainLookupService: DomainLookupService) {}

  /**
   * Check if a domain is allowed for on-demand TLS
   * Called by Caddy before issuing a certificate
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkDomain(@Query('domain') domain: string): Promise<void> {
    if (!domain) {
      // No domain provided, reject
      throw new Error('Domain parameter required');
    }

    const result = await this.domainLookupService.lookupDomain(domain);

    if (!result) {
      // Domain not found or not verified, reject
      // Caddy will not issue a certificate for this domain
      throw new Error('Domain not found');
    }

    // Domain is verified and allowed
    // Return 200 OK (empty response)
    return;
  }
}
