// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Extend Express Request to include requestId
// Extend Express Request to include requestId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      publicConsumerCode?: string;
    }
  }
}

/**
 * Logging Interceptor
 * PRD §4.2: Request/Response logging with trace ID
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const publicConsumerCode = this.getPublicConsumerCode(request);

    // Generate or use existing request ID
    const requestId = (request.headers['x-request-id'] as string) || `req_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
    request.requestId = requestId;
    request.publicConsumerCode = publicConsumerCode;
    
    // Set response header
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();
    const consumerSuffix = publicConsumerCode ? ` - consumer=${publicConsumerCode}` : '';

    // Log request
    this.logger.log(
      `→ ${method} ${url} - ${ip} - ${userAgent.substring(0, 50)}${consumerSuffix}`,
      { requestId },
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.logger.log(
            `← ${method} ${url} - ${statusCode} - ${duration}ms${consumerSuffix}`,
            { requestId },
          );
        },
        error: () => {
          const duration = Date.now() - startTime;
          
          this.logger.warn(
            `← ${method} ${url} - ERROR - ${duration}ms${consumerSuffix}`,
            { requestId },
          );
        },
      }),
    );
  }

  private getPublicConsumerCode(request: Request): string | undefined {
    const rawHeader = request.headers[BROWSER_PUBLIC_CONSUMER_HEADER.toLowerCase()];
    const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!candidate) {
      return undefined;
    }

    const normalized = candidate.trim();
    if (!/^[a-z0-9._-]{1,64}$/i.test(normalized)) {
      return undefined;
    }

    return normalized;
  }
}
