// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { IncomingHttpHeaders } from 'http';

import { IntegrationLogService } from '../../log';
import { ApiKeyService } from '../services/api-key.service';

type ValidatedConsumer = NonNullable<Awaited<ReturnType<ApiKeyService['validateApiKey']>>>;

interface IntegrationLogContext {
  consumer: ValidatedConsumer;
  startTime: number;
}

interface ApiKeyRequest extends Request {
  consumer?: ValidatedConsumer;
  _integrationLogContext?: IntegrationLogContext;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly integrationLogService: IntegrationLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = this.extractApiKey(request);
    const startTime = Date.now();

    if (!apiKey) {
      await this.logInbound(request, null, 401, 'Missing API Key', startTime);
      throw new UnauthorizedException('API Key is required');
    }

    const consumer = await this.apiKeyService.validateApiKey(apiKey);

    if (!consumer) {
      await this.logInbound(request, null, 401, 'Invalid API Key', startTime);
      throw new UnauthorizedException('Invalid API Key');
    }

    // IP whitelist check
    if (consumer.allowedIps && consumer.allowedIps.length > 0) {
      const clientIp = this.getClientIp(request);
      if (!this.apiKeyService.isIpAllowed(clientIp, consumer.allowedIps)) {
        await this.logInbound(request, consumer, 403, 'IP not allowed', startTime);
        throw new ForbiddenException('IP address not allowed');
      }
    }

    request.consumer = consumer;
    request._integrationLogContext = {
      consumer,
      startTime,
    };

    return true;
  }

  private extractApiKey(request: Request): string | null {
    return (
      this.getHeaderValue(request.headers['x-api-key']) ??
      this.getQueryValue(request.query['api_key'])
    );
  }

  private getClientIp(request: Request): string {
    return (
      this.getHeaderValue(request.headers['cf-connecting-ip']) ||
      this.getHeaderValue(request.headers['x-real-ip']) ||
      this.getHeaderValue(request.headers['x-forwarded-for'])?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown'
    );
  }

  private async logInbound(
    request: Request,
    consumer: ValidatedConsumer | null,
    status: number,
    errorMessage: string | null,
    startTime: number,
  ): Promise<void> {
    try {
      await this.integrationLogService.logInbound({
        consumerId: consumer?.id,
        consumerCode: consumer?.code,
        endpoint: request.url,
        method: request.method,
        requestHeaders: this.maskHeaders(request.headers),
        requestBody: request.body,
        responseStatus: status,
        errorMessage,
        latencyMs: Date.now() - startTime,
        traceId: this.getHeaderValue(request.headers['x-trace-id']) ?? undefined,
      });
    } catch {
      // Silently fail logging
    }
  }

  private maskHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) {
        continue;
      }

      const normalizedValue = Array.isArray(value) ? value.join(', ') : value;
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = normalizedValue;
      }
    }

    return result;
  }

  private getHeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }

  private getQueryValue(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const firstValue = value[0];
      return typeof firstValue === 'string' ? firstValue : null;
    }

    return null;
  }
}
