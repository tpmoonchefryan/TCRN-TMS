// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { HealthCheckResponse } from '@tcrn/shared';

import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

const HEALTH_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'], example: 'healthy' },
    timestamp: { type: 'string', format: 'date-time', example: '2026-04-13T13:30:00.000Z' },
    version: { type: 'string', example: '0.1.0' },
    services: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['up', 'down'], example: 'up' },
          latency: { type: 'integer', nullable: true, example: 12 },
          message: { type: 'string', nullable: true, example: null },
        },
        required: ['status'],
      },
      example: {
        database: { status: 'up', latency: 12, message: null },
        redis: { status: 'up', latency: 4, message: null },
        minio: { status: 'up', latency: 9, message: null },
      },
    },
  },
  required: ['status', 'timestamp', 'version', 'services'],
};

const HEALTH_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', example: 'ok' },
  },
  required: ['status'],
  example: { status: 'ok' },
};

const HEALTH_UNAVAILABLE_SCHEMA = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer', example: 503 },
    message: { type: 'string', example: 'Service not ready' },
    error: { type: 'string', example: 'Service Unavailable' },
  },
  required: ['statusCode', 'message', 'error'],
  example: {
    statusCode: 503,
    message: 'Service not ready',
    error: 'Service Unavailable',
  },
};

@ApiTags('Public - Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: HEALTH_CHECK_SCHEMA,
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive', schema: HEALTH_STATUS_SCHEMA })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready', schema: HEALTH_STATUS_SCHEMA })
  @ApiResponse({ status: 503, description: 'Service is not ready', schema: HEALTH_UNAVAILABLE_SCHEMA })
  async ready(): Promise<{ status: string }> {
    const health = await this.healthService.check();
    if (health.status === 'unhealthy') {
      throw new ServiceUnavailableException('Service not ready');
    }
    return { status: 'ok' };
  }
}
