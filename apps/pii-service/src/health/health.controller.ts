// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation,ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { CryptoService } from '../crypto/services/crypto.service';
import { PrismaClient } from '.prisma/pii-client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject('PII_PRISMA') private readonly prisma: PrismaClient,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Health check endpoint
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Encryption check
    try {
      const testData = { test: 'data' };
      const hash = this.cryptoService.computeHash(testData);
      checks.encryption = hash ? 'ok' : 'error';
    } catch {
      checks.encryption = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Liveness probe
   */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe
   */
  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'not_ready' };
    }
  }
}
