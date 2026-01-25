// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// OpenTelemetry initialization for TCRN TMS (PRD P-32)

import { Logger } from '@nestjs/common';
import { createSampler } from './sampler';
import { SlowRequestProcessor, ErrorCapturingProcessor } from './slow-request-processor';

const logger = new Logger('Telemetry');

// Check if OpenTelemetry should be enabled
const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

/**
 * OpenTelemetry configuration options
 */
export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
}

/**
 * Get default telemetry configuration
 */
export function getDefaultTelemetryConfig(): TelemetryConfig {
  return {
    serviceName: process.env.OTEL_SERVICE_NAME || 'tcrn-tms-api',
    serviceVersion: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    endpoint: OTEL_ENDPOINT,
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

  // Skip if not enabled
  if (!OTEL_ENABLED) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AnyModule = any;

    // Use type casting to avoid compile-time type checking for optional deps
    const sdkNode: AnyModule = await import('@opentelemetry/sdk-node');
    const autoInstrument: AnyModule = await import('@opentelemetry/auto-instrumentations-node');
    const traceExporterModule: AnyModule = await import('@opentelemetry/exporter-trace-otlp-http');
    const metricExporterModule: AnyModule = await import('@opentelemetry/exporter-metrics-otlp-http');
    const metricsModule: AnyModule = await import('@opentelemetry/sdk-metrics');
    const resourcesModule: AnyModule = await import('@opentelemetry/resources');
    const semanticModule: AnyModule = await import('@opentelemetry/semantic-conventions');
    const traceBaseModule: AnyModule = await import('@opentelemetry/sdk-trace-base');

    // Extract classes/constants (handle both default and named exports)
    const NodeSDK = sdkNode.NodeSDK;
    const getNodeAutoInstrumentations = autoInstrument.getNodeAutoInstrumentations;
    const OTLPTraceExporter = traceExporterModule.OTLPTraceExporter;
    const OTLPMetricExporter = metricExporterModule.OTLPMetricExporter;
    const PeriodicExportingMetricReader = metricsModule.PeriodicExportingMetricReader;
    const Resource = resourcesModule.Resource;
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

    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${telemetryConfig.endpoint}/v1/metrics`,
    });

    // Create SDK - use type assertion for sampler compatibility
    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: telemetryConfig.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: telemetryConfig.serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: telemetryConfig.environment,
      }),

      // Use custom sampler (cast to any for compatibility with dynamic types)
      sampler: createSampler() as unknown,

      // Trace exporter with batch processing
      traceExporter,

      // Add custom span processors
      spanProcessors: [
        new SlowRequestProcessor() as unknown,
        new ErrorCapturingProcessor() as unknown,
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        }),
      ],

      // Metric reader
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
      }),

      // Auto-instrumentations
      instrumentations: [
        getNodeAutoInstrumentations({
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
        } as Record<string, unknown>),
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
export function isTelemetryEnabled(): boolean {
  return OTEL_ENABLED && !!OTEL_ENDPOINT;
}
