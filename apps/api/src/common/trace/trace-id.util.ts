// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from 'crypto';

type HeaderValue = string | string[] | undefined;

export interface TraceIdRequestFields {
  requestId?: string;
  traceId?: string;
}

const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const TRACEPARENT_PATTERN = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i;
const ZERO_TRACE_ID = '00000000000000000000000000000000';

export function generateTraceId(): string {
  return `trace_${randomUUID().replace(/-/g, '')}`;
}

export function isValidTraceId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_TRACE_ID_PATTERN.test(value.trim());
}

export function resolveHeaderValue(
  headers: Record<string, HeaderValue>,
  name: string
): string | undefined {
  const directValue = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  const value = Array.isArray(directValue) ? directValue[0] : directValue;
  return typeof value === 'string' ? value.trim() : undefined;
}

export function extractTraceIdFromTraceparent(traceparent: string | undefined): string | undefined {
  if (!traceparent) {
    return undefined;
  }

  const match = traceparent.trim().match(TRACEPARENT_PATTERN);
  const traceId = match?.[1]?.toLowerCase();
  if (!traceId || traceId === ZERO_TRACE_ID) {
    return undefined;
  }

  return traceId;
}

export function resolveTraceIdFromHeaders(
  headers: Record<string, HeaderValue>,
  createId: () => string = generateTraceId
): string {
  const explicitTraceId = resolveHeaderValue(headers, 'x-trace-id');
  if (isValidTraceId(explicitTraceId)) {
    return explicitTraceId;
  }

  const requestId = resolveHeaderValue(headers, 'x-request-id');
  if (isValidTraceId(requestId)) {
    return requestId;
  }

  const traceparentTraceId = extractTraceIdFromTraceparent(
    resolveHeaderValue(headers, 'traceparent')
  );
  if (traceparentTraceId) {
    return traceparentTraceId;
  }

  return createId();
}
