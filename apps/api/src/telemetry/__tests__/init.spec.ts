// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import { getDefaultTelemetryConfig, isTelemetryEnabled } from '../init';

describe('telemetry init config', () => {
  it('does not infer a metrics endpoint from the trace endpoint', () => {
    const config = getDefaultTelemetryConfig({
      OTEL_SERVICE_NAME: 'test-api',
      APP_VERSION: '1.2.3',
      NODE_ENV: 'test',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://tempo:4318',
    });

    expect(config).toEqual({
      serviceName: 'test-api',
      serviceVersion: '1.2.3',
      environment: 'test',
      endpoint: 'http://tempo:4318',
      metricsEndpoint: undefined,
    });
  });

  it('uses a dedicated metrics endpoint when explicitly provided', () => {
    const config = getDefaultTelemetryConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://tempo:4318',
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'http://otel-collector:4318',
    });

    expect(config.endpoint).toBe('http://tempo:4318');
    expect(config.metricsEndpoint).toBe('http://otel-collector:4318');
  });

  it('treats telemetry as enabled only when tracing is enabled with a trace endpoint', () => {
    expect(
      isTelemetryEnabled({
        OTEL_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://tempo:4318',
      }),
    ).toBe(true);

    expect(
      isTelemetryEnabled({
        OTEL_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'http://otel-collector:4318',
      }),
    ).toBe(false);
  });
});
