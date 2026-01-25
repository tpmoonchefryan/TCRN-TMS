// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Custom layered sampler for TCRN TMS (PRD P-32)

// Types are defined inline to avoid requiring @opentelemetry/* at compile time
// Actual types will be used when OpenTelemetry is installed and enabled

/**
 * Sampling decision enum (matches @opentelemetry/sdk-trace-base)
 */
export enum SamplingDecision {
  NOT_RECORD = 0,
  RECORD = 1,
  RECORD_AND_SAMPLED = 2,
}

/**
 * Sampling result interface
 */
export interface SamplingResult {
  decision: SamplingDecision;
  attributes?: Record<string, unknown>;
}

/**
 * Sampler interface
 */
export interface Sampler {
  shouldSample(
    context: unknown,
    traceId: string,
    spanName: string,
    spanKind: number,
    attributes: Record<string, unknown>,
    links: unknown[]
  ): SamplingResult;
  toString(): string;
}

/**
 * Sampling rule configuration
 */
interface SamplingRule {
  /** URL pattern to match */
  pattern: RegExp;
  /** Sampling rate (0.0 - 1.0) */
  rate: number;
  /** Rule description for debugging */
  description: string;
}

/**
 * TCRN Custom Sampler
 *
 * Implements layered sampling strategy per PRD P-32:
 * - Error responses: 100% (captured in span processor)
 * - Slow requests (>2s): 100% (captured in span processor)
 * - Auth endpoints: 10%
 * - PII service calls: 10%
 * - Report operations: 50%
 * - External pages (homepage/marshmallow): 0.5%
 * - Other API endpoints: 1%
 */
export class TcrnSampler implements Sampler {
  private readonly rules: SamplingRule[] = [
    // Auth endpoints - 10% sampling
    {
      pattern: /^\/api\/v1\/auth\/.*/,
      rate: 0.1,
      description: 'auth',
    },

    // PII service calls - 10% sampling
    {
      pattern: /^\/pii-service\/.*/,
      rate: 0.1,
      description: 'pii',
    },

    // Report operations - 50% sampling
    {
      pattern: /^\/api\/v1\/reports\/.*/,
      rate: 0.5,
      description: 'reports',
    },

    // External homepage - 0.5% sampling
    {
      pattern: /^\/p\/.*/,
      rate: 0.005,
      description: 'homepage',
    },

    // External marshmallow - 0.5% sampling
    {
      pattern: /^\/m\/.*/,
      rate: 0.005,
      description: 'marshmallow',
    },

    // Public API endpoints - 0.5% sampling
    {
      pattern: /^\/api\/v1\/public\/.*/,
      rate: 0.005,
      description: 'public-api',
    },

    // Health check endpoints - never sample
    {
      pattern: /^\/health.*/,
      rate: 0,
      description: 'health',
    },

    // Metrics endpoint - never sample
    {
      pattern: /^\/metrics.*/,
      rate: 0,
      description: 'metrics',
    },

    // Other API endpoints - 1% sampling
    {
      pattern: /^\/api\/.*/,
      rate: 0.01,
      description: 'api',
    },
  ];

  /**
   * Determine if a span should be sampled
   */
  shouldSample(
    _context: unknown,
    traceId: string,
    spanName: string,
    _spanKind: number,
    attributes: Record<string, unknown>,
    _links: unknown[]
  ): SamplingResult {
    // Extract HTTP path from attributes
    const httpTarget = attributes['http.target'] as string | undefined;
    const httpRoute = attributes['http.route'] as string | undefined;
    const path = httpTarget || httpRoute || spanName;

    // Check for error status code - always sample errors
    const statusCode = attributes['http.status_code'] as number | undefined;
    if (statusCode && statusCode >= 400) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {
          'sampling.reason': 'error_response',
          'sampling.rule': 'error',
        },
      };
    }

    // Match against rules
    for (const rule of this.rules) {
      if (rule.pattern.test(path)) {
        // Never sample (rate = 0)
        if (rule.rate === 0) {
          return { decision: SamplingDecision.NOT_RECORD };
        }

        // Always sample (rate = 1)
        if (rule.rate === 1) {
          return {
            decision: SamplingDecision.RECORD_AND_SAMPLED,
            attributes: {
              'sampling.reason': 'always_sample',
              'sampling.rule': rule.description,
            },
          };
        }

        // Probabilistic sampling based on trace ID for consistency
        const shouldSample = this.traceIdBasedSample(traceId, rule.rate);

        return {
          decision: shouldSample
            ? SamplingDecision.RECORD_AND_SAMPLED
            : SamplingDecision.NOT_RECORD,
          attributes: shouldSample
            ? {
                'sampling.reason': 'probabilistic',
                'sampling.rule': rule.description,
                'sampling.rate': rule.rate,
              }
            : undefined,
        };
      }
    }

    // Default: 1% sampling for unmatched paths
    const shouldSample = this.traceIdBasedSample(traceId, 0.01);

    return {
      decision: shouldSample
        ? SamplingDecision.RECORD_AND_SAMPLED
        : SamplingDecision.NOT_RECORD,
      attributes: shouldSample
        ? {
            'sampling.reason': 'default',
            'sampling.rule': 'default',
            'sampling.rate': 0.01,
          }
        : undefined,
    };
  }

  /**
   * Trace ID based sampling for consistency
   * Same trace ID will always produce same sampling decision
   */
  private traceIdBasedSample(traceId: string, rate: number): boolean {
    // Use last 8 characters of trace ID as hex number
    const suffix = traceId.substring(traceId.length - 8);
    const value = parseInt(suffix, 16) / 0xffffffff;
    return value < rate;
  }

  /**
   * Sampler description
   */
  toString(): string {
    return 'TcrnSampler{layered}';
  }
}

/**
 * Create a sampler based on environment
 */
export function createSampler(): Sampler {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') {
    // In development, sample everything for easier debugging
    return {
      shouldSample: () => ({
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: { 'sampling.reason': 'development' },
      }),
      toString: () => 'AlwaysSampler{development}',
    };
  }

  return new TcrnSampler();
}
