// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimitStatsResponse, RateLimitStatsService } from '../services/rate-limit-stats.service';

/**
 * Rate Limit Stats Controller
 * Provides endpoints for viewing rate limit statistics
 */
@ApiTags('Security')
@Controller('rate-limit')
@UseGuards(JwtAuthGuard)
export class RateLimitStatsController {
  constructor(private readonly rateLimitStatsService: RateLimitStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limit statistics' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit statistics including summary, top endpoints, and top IPs',
  })
  async getStats(): Promise<RateLimitStatsResponse> {
    return this.rateLimitStatsService.getStats();
  }
}
