// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { resolveTraceIdFromHeaders } from './trace-id.util';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      traceId?: string;
    }
  }
}

export function createTraceIdMiddleware(): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const traceId = resolveTraceIdFromHeaders(request.headers);

    request.traceId = traceId;
    request.requestId = traceId;

    response.setHeader('X-Trace-ID', traceId);
    response.setHeader('X-Request-ID', traceId);

    next();
  };
}
