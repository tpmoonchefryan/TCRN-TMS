// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimitStatsResponse, RateLimitStatsService } from '../services/rate-limit-stats.service';

const RATE_LIMIT_STATS_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        totalRequests24h: { type: 'integer', example: 12450 },
        blockedRequests24h: { type: 'integer', example: 32 },
        uniqueIPs24h: { type: 'integer', example: 187 },
        currentlyBlocked: { type: 'integer', example: 4 },
      },
      required: ['totalRequests24h', 'blockedRequests24h', 'uniqueIPs24h', 'currentlyBlocked'],
    },
    topEndpoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', example: '/api/v1/global/api' },
          method: { type: 'string', example: 'GET' },
          current: { type: 'integer', example: 42 },
          limit: { type: 'integer', example: 100 },
          resetIn: { type: 'integer', example: 45 },
        },
        required: ['endpoint', 'method', 'current', 'limit', 'resetIn'],
      },
    },
    topIPs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ip: { type: 'string', example: '203.0.113.10' },
          requests: { type: 'integer', example: 188 },
          blocked: { type: 'boolean', example: true },
          lastSeen: { type: 'string', example: 'recently' },
        },
        required: ['ip', 'requests', 'blocked', 'lastSeen'],
      },
    },
    lastUpdated: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
  },
  required: ['summary', 'topEndpoints', 'topIPs', 'lastUpdated'],
  example: {
    summary: {
      totalRequests24h: 12450,
      blockedRequests24h: 32,
      uniqueIPs24h: 187,
      currentlyBlocked: 4,
    },
    topEndpoints: [
      {
        endpoint: '/api/v1/global/api',
        method: 'GET',
        current: 42,
        limit: 100,
        resetIn: 45,
      },
    ],
    topIPs: [
      {
        ip: '203.0.113.10',
        requests: 188,
        blocked: true,
        lastSeen: 'recently',
      },
    ],
    lastUpdated: '2026-04-13T09:30:00.000Z',
  },
};

const RATE_LIMIT_UNAUTHORIZED_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AUTH_UNAUTHORIZED' },
        message: { type: 'string', example: 'Authentication required' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Authentication required',
    },
  },
};

/**
 * Rate Limit Stats Controller
 * Provides endpoints for viewing rate limit statistics
 */
@ApiTags('Security')
@ApiBearerAuth()
@Controller('rate-limit')
@UseGuards(JwtAuthGuard)
export class RateLimitStatsController {
  constructor(private readonly rateLimitStatsService: RateLimitStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limit statistics' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit statistics including summary, top endpoints, and top IPs',
    schema: RATE_LIMIT_STATS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read rate limit statistics',
    schema: RATE_LIMIT_UNAUTHORIZED_SCHEMA,
  })
  async getStats(): Promise<RateLimitStatsResponse> {
    return this.rateLimitStatsService.getStats();
  }
}
