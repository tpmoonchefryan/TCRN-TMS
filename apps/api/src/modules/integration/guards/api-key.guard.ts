// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

import { IntegrationLogService } from '../../log';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly integrationLogService: IntegrationLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
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

    // Attach consumer info to request
    (request as any).consumer = consumer;
    (request as any)._integrationLogContext = {
      consumer,
      startTime,
    };

    return true;
  }

  private extractApiKey(request: Request): string | null {
    const headerKey = request.headers['x-api-key'] as string;
    const queryKey = request.query['api_key'] as string;
    return headerKey || queryKey || null;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['cf-connecting-ip'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      'unknown'
    );
  }

  private async logInbound(
    request: Request,
    consumer: any | null,
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
        requestHeaders: this.maskHeaders(request.headers as Record<string, string>),
        requestBody: request.body,
        responseStatus: status,
        errorMessage,
        latencyMs: Date.now() - startTime,
        traceId: request.headers['x-trace-id'] as string,
      });
    } catch {
      // Silently fail logging
    }
  }

  private maskHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
