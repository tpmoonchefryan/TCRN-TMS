// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { resolveTraceIdFromHeaders } from './trace-id.util';

describe('trace id utilities', () => {
  it('preserves a valid x-trace-id header', () => {
    const traceId = resolveTraceIdFromHeaders(
      { 'x-trace-id': 'trace_custom-domain_123' },
      () => 'trace_generated'
    );

    expect(traceId).toBe('trace_custom-domain_123');
  });

  it('uses a valid x-request-id as compatibility fallback', () => {
    const traceId = resolveTraceIdFromHeaders(
      { 'x-request-id': 'req_existing_456' },
      () => 'trace_generated'
    );

    expect(traceId).toBe('req_existing_456');
  });

  it('extracts the W3C trace id from traceparent', () => {
    const traceId = resolveTraceIdFromHeaders(
      {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
      () => 'trace_generated'
    );

    expect(traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('ignores invalid inbound trace values', () => {
    const traceId = resolveTraceIdFromHeaders(
      {
        'x-trace-id': 'bad\ntrace',
        'x-request-id': '<script>',
        traceparent: '00-00000000000000000000000000000000-00f067aa0ba902b7-01',
      },
      () => 'trace_generated'
    );

    expect(traceId).toBe('trace_generated');
  });

  it('generates a trace id when no valid inbound id exists', () => {
    const traceId = resolveTraceIdFromHeaders({}, () => 'trace_generated');

    expect(traceId).toBe('trace_generated');
  });
});
