// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@tcrn/shared';

import { DatabaseService } from '../database';
import { MinioService } from '../minio';
import { RedisService } from '../redis';

@Injectable()
export class HealthService {
  private readonly appVersion = '0.1.0';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  async check(): Promise<HealthCheckResponse> {
    const services: HealthCheckResponse['services'] = {};

    // Check database connection
    services.database = await this.checkDatabase();

    // Check Redis connection
    services.redis = await this.checkRedis();

    // Check MinIO connection
    services.minio = await this.checkMinio();

    // Determine overall status
    const allHealthy = Object.values(services).every((s: any) => s.status === 'up');
    const anyHealthy = Object.values(services).some((s: any) => s.status === 'up');

    let status: HealthCheckResponse['status'];
    if (allHealthy) {
      status = 'healthy';
    } else if (anyHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.appVersion,
      services,
    };
  }

  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    latency?: number;
    message?: string;
  }> {
    try {
      const start = Date.now();
      const isHealthy = await this.databaseService.isHealthy();
      const latency = Date.now() - start;
      
      if (isHealthy) {
        return { status: 'up', latency };
      }
      return { status: 'down', message: 'Database check failed' };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<{
    status: 'up' | 'down';
    latency?: number;
    message?: string;
  }> {
    try {
      const start = Date.now();
      const isHealthy = await this.redisService.isHealthy();
      const latency = Date.now() - start;
      
      if (isHealthy) {
        return { status: 'up', latency };
      }
      return { status: 'down', message: 'Redis check failed' };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMinio(): Promise<{
    status: 'up' | 'down';
    latency?: number;
    message?: string;
  }> {
    try {
      const start = Date.now();
      const isHealthy = await this.minioService.isHealthy();
      const latency = Date.now() - start;
      
      if (isHealthy) {
        return { status: 'up', latency };
      }
      return { status: 'down', message: 'MinIO check failed' };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
