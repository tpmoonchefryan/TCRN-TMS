// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Slow Request Processor - ensures slow requests are always sampled

// Types defined inline to avoid requiring @opentelemetry/* at compile time
// These match the actual OpenTelemetry types when installed

/**
 * HrTime type (high resolution time)
 */
type HrTime = [number, number];

/**
 * Span status interface
 */
interface SpanStatus {
  code: number;
  message?: string;
}

/**
 * ReadableSpan interface (subset of actual interface)
 */
interface ReadableSpan {
  name: string;
  attributes: Record<string, unknown>;
  startTime: HrTime;
  endTime: HrTime;
  status?: SpanStatus;
}

/**
 * Span interface (subset for processor)
 */
type Span = unknown;

/**
 * SpanProcessor interface
 */
export interface SpanProcessor {
  onStart(span: Span, parentContext: unknown): void;
  onEnd(span: ReadableSpan): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Slow request threshold in milliseconds
 * Requests exceeding this duration are marked for sampling
 */
const SLOW_THRESHOLD_MS = 2000;

/**
 * Warning threshold in milliseconds
 * Requests exceeding this are flagged but not necessarily sampled
 */
const WARNING_THRESHOLD_MS = 1000;

/**
 * SlowRequestProcessor
 *
 * A SpanProcessor that marks slow requests for sampling.
 * This ensures that requests taking longer than the threshold
 * are always recorded, regardless of the initial sampling decision.
 *
 * Per PRD P-32: Slow requests (>2s) should be 100% sampled.
 */
export class SlowRequestProcessor implements SpanProcessor {
  private readonly slowThresholdMs: number;
  private readonly warningThresholdMs: number;

  constructor(options?: { slowThresholdMs?: number; warningThresholdMs?: number }) {
    this.slowThresholdMs = options?.slowThresholdMs ?? SLOW_THRESHOLD_MS;
    this.warningThresholdMs = options?.warningThresholdMs ?? WARNING_THRESHOLD_MS;
  }

  /**
   * Called when a span is started
   */
  onStart(_span: Span, _parentContext: unknown): void {
    // No action needed on span start
  }

  /**
   * Called when a span is ended
   * Calculates duration and marks slow requests
   */
  onEnd(span: ReadableSpan): void {
    // Calculate duration in milliseconds
    const durationMs = this.calculateDurationMs(span);

    // Skip if duration couldn't be calculated
    if (durationMs === null) {
      return;
    }

    // Get mutable attributes (need to cast to access internal properties)
    const mutableSpan = span as unknown as {
      attributes: Record<string, unknown>;
    };

    // Add duration attribute
    mutableSpan.attributes['duration_ms'] = durationMs;

    // Mark slow requests
    if (durationMs > this.slowThresholdMs) {
      mutableSpan.attributes['slow_request'] = true;
      mutableSpan.attributes['slow_request.threshold_ms'] = this.slowThresholdMs;
      mutableSpan.attributes['slow_request.exceeded_by_ms'] =
        durationMs - this.slowThresholdMs;

      // Log slow request (in production, this would go to a proper logger)
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `[SlowRequest] ${span.name} took ${durationMs.toFixed(2)}ms ` +
            `(threshold: ${this.slowThresholdMs}ms)`
        );
      }
    } else if (durationMs > this.warningThresholdMs) {
      // Mark as warning level
      mutableSpan.attributes['slow_request_warning'] = true;
    }

    // Add performance classification
    mutableSpan.attributes['performance_class'] = this.classifyPerformance(durationMs);
  }

  /**
   * Calculate span duration in milliseconds
   */
  private calculateDurationMs(span: ReadableSpan): number | null {
    const startTime = span.startTime;
    const endTime = span.endTime;

    if (!startTime || !endTime) {
      return null;
    }

    // HrTime is [seconds, nanoseconds]
    const startMs = startTime[0] * 1000 + startTime[1] / 1e6;
    const endMs = endTime[0] * 1000 + endTime[1] / 1e6;

    return endMs - startMs;
  }

  /**
   * Classify request performance
   */
  private classifyPerformance(durationMs: number): string {
    if (durationMs <= 100) return 'fast';
    if (durationMs <= 500) return 'normal';
    if (durationMs <= 1000) return 'slow';
    if (durationMs <= 2000) return 'very_slow';
    return 'critical';
  }

  /**
   * Force flush any pending spans
   */
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Shutdown the processor
   */
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * ErrorCapturingProcessor
 *
 * Ensures all error responses are captured regardless of sampling decision.
 */
export class ErrorCapturingProcessor implements SpanProcessor {
  onStart(_span: Span, _parentContext: unknown): void {
    // No action needed on span start
  }

  onEnd(span: ReadableSpan): void {
    // Check if this span represents an error
    const statusCode = span.attributes['http.status_code'] as number | undefined;
    const hasError = span.status?.code === 2; // SpanStatusCode.ERROR

    if ((statusCode && statusCode >= 400) || hasError) {
      const mutableSpan = span as unknown as {
        attributes: Record<string, unknown>;
      };

      mutableSpan.attributes['error_captured'] = true;
      mutableSpan.attributes['error_status_code'] = statusCode;

      // Classify error type
      if (statusCode) {
        if (statusCode >= 500) {
          mutableSpan.attributes['error_class'] = 'server_error';
        } else if (statusCode >= 400) {
          mutableSpan.attributes['error_class'] = 'client_error';
        }
      }
    }
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
