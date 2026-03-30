// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// OpenTelemetry initialization for TCRN TMS (PRD P-32)

import { Logger } from '@nestjs/common';
import type { InstrumentationConfigMap } from '@opentelemetry/auto-instrumentations-node';
import type { Sampler as OtelSampler } from '@opentelemetry/sdk-trace-base';

import { createSampler } from './sampler';
import { ErrorCapturingProcessor, SlowRequestProcessor } from './slow-request-processor';

type OtelAutoInstrumentationModule = typeof import('@opentelemetry/auto-instrumentations-node');
type OtelMetricExporterModule = typeof import('@opentelemetry/exporter-metrics-otlp-http');
type OtelTraceExporterModule = typeof import('@opentelemetry/exporter-trace-otlp-http');
type OtelResourcesModule = typeof import('@opentelemetry/resources');
type OtelSdkMetricsModule = typeof import('@opentelemetry/sdk-metrics');
type OtelSdkNodeModule = typeof import('@opentelemetry/sdk-node');
type OtelSemanticModule = typeof import('@opentelemetry/semantic-conventions');
type OtelTraceBaseModule = typeof import('@opentelemetry/sdk-trace-base');

const logger = new Logger('Telemetry');

/**
 * OpenTelemetry configuration options
 */
export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
  metricsEndpoint?: string;
}

/**
 * Get default telemetry configuration
 */
export function getDefaultTelemetryConfig(
  env: NodeJS.ProcessEnv = process.env,
): TelemetryConfig {
  return {
    serviceName: env.OTEL_SERVICE_NAME || 'tcrn-tms-api',
    serviceVersion: env.APP_VERSION || 'unknown',
    environment: env.NODE_ENV || 'development',
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    metricsEndpoint: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  };
}

/**
 * Initialize OpenTelemetry SDK
 *
 * This function sets up:
 * - Custom sampler with layered sampling rates
 * - Slow request processor for capturing slow requests
 * - Error capturing processor for all errors
 * - OTLP exporter to Grafana Tempo
 *
 * To enable:
 * 1. Install dependencies: @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, etc.
 * 2. Set OTEL_ENABLED=true
 * 3. Set OTEL_EXPORTER_OTLP_ENDPOINT (e.g., http://tempo:4318)
 */
export async function initTelemetry(config?: Partial<TelemetryConfig>): Promise<void> {
  const telemetryConfig = { ...getDefaultTelemetryConfig(), ...config };
  const otelEnabled = process.env.OTEL_ENABLED === 'true';

  // Skip if not enabled
  if (!otelEnabled) {
    logger.log('OpenTelemetry disabled (set OTEL_ENABLED=true to enable)');
    return;
  }

  // Check for endpoint
  if (!telemetryConfig.endpoint) {
    logger.warn('OpenTelemetry enabled but OTEL_EXPORTER_OTLP_ENDPOINT not set');
    return;
  }

  try {
    // Dynamic import to avoid loading dependencies if not enabled
    const sdkNode = (await import('@opentelemetry/sdk-node')) as OtelSdkNodeModule;
    const autoInstrument = (await import('@opentelemetry/auto-instrumentations-node')) as OtelAutoInstrumentationModule;
    const traceExporterModule = (await import('@opentelemetry/exporter-trace-otlp-http')) as OtelTraceExporterModule;
    const resourcesModule = (await import('@opentelemetry/resources')) as OtelResourcesModule;
    const semanticModule = (await import('@opentelemetry/semantic-conventions')) as OtelSemanticModule;
    const traceBaseModule = (await import('@opentelemetry/sdk-trace-base')) as OtelTraceBaseModule;

    // Extract classes/constants after the opt-in gate to avoid eager runtime loading.
    const NodeSDK = sdkNode.NodeSDK;
    const getNodeAutoInstrumentations = autoInstrument.getNodeAutoInstrumentations;
    const OTLPTraceExporter = traceExporterModule.OTLPTraceExporter;
    const resourceFromAttributes = resourcesModule.resourceFromAttributes;
    const SEMRESATTRS_SERVICE_NAME = semanticModule.SEMRESATTRS_SERVICE_NAME;
    const SEMRESATTRS_SERVICE_VERSION = semanticModule.SEMRESATTRS_SERVICE_VERSION;
    const SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = semanticModule.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT;
    const BatchSpanProcessor = traceBaseModule.BatchSpanProcessor;

    logger.log(`Initializing OpenTelemetry for ${telemetryConfig.serviceName}`);
    logger.log(`Exporting to: ${telemetryConfig.endpoint}`);

    // Create trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${telemetryConfig.endpoint}/v1/traces`,
    });

    let metricReader:
      | InstanceType<OtelSdkMetricsModule['PeriodicExportingMetricReader']>
      | undefined;

    if (telemetryConfig.metricsEndpoint) {
      const metricExporterModule =
        (await import('@opentelemetry/exporter-metrics-otlp-http')) as OtelMetricExporterModule;
      const metricsModule = (await import('@opentelemetry/sdk-metrics')) as OtelSdkMetricsModule;
      const OTLPMetricExporter = metricExporterModule.OTLPMetricExporter;
      const PeriodicExportingMetricReader = metricsModule.PeriodicExportingMetricReader;
      const metricExporter = new OTLPMetricExporter({
        url: `${telemetryConfig.metricsEndpoint}/v1/metrics`,
      });

      metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
      });
    } else {
      logger.log(
        'OpenTelemetry metrics exporter disabled (set OTEL_EXPORTER_OTLP_METRICS_ENDPOINT to enable)',
      );
    }

    const instrumentationConfig: InstrumentationConfigMap = {
      // Disable filesystem instrumentation (too noisy)
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (request: { url?: string }) => {
          // Ignore health checks and metrics
          const url = request.url || '';
          return (
            url === '/health' ||
            url === '/health/live' ||
            url === '/health/ready' ||
            url === '/metrics'
          );
        },
      },
      // Configure Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      // Configure Prisma/pg instrumentation
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: true,
      },
      // Configure ioredis instrumentation (redis-4 was renamed)
      '@opentelemetry/instrumentation-ioredis': {
        enabled: true,
      },
    };

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: telemetryConfig.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: telemetryConfig.serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: telemetryConfig.environment,
      }),

      sampler: createSampler() as OtelSampler,

      // Trace exporter with batch processing
      traceExporter,

      // Add custom span processors
      spanProcessors: [
        new SlowRequestProcessor(),
        new ErrorCapturingProcessor(),
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        }),
      ],

      ...(metricReader ? { metricReader } : {}),

      // Auto-instrumentations
      instrumentations: [
        getNodeAutoInstrumentations(instrumentationConfig),
      ],
    });

    // Start SDK
    await sdk.start();

    logger.log('OpenTelemetry SDK started successfully');

    // Graceful shutdown
    const shutdown = async () => {
      logger.log('Shutting down OpenTelemetry SDK...');
      try {
        await sdk.shutdown();
        logger.log('OpenTelemetry SDK shut down successfully');
      } catch (error) {
        logger.error('Error shutting down OpenTelemetry SDK', error);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    // Dependencies not installed or other error
    logger.warn(
      'Failed to initialize OpenTelemetry. Dependencies may not be installed.',
      error instanceof Error ? error.message : String(error)
    );
    logger.log('To install OpenTelemetry dependencies, run:');
    logger.log(
      'pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node ' +
        '@opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http'
    );
  }
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.OTEL_ENABLED === 'true' && !!env.OTEL_EXPORTER_OTLP_ENDPOINT;
}
