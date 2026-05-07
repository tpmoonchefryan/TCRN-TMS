import { ApiRequestError } from '@/platform/http/api';

export interface SafeApiErrorView {
  code: string;
  traceId?: string;
  title: string;
  description: string;
}

export interface SafeApiErrorCopy {
  fallbackTitle: string;
  fallbackDescription: string;
  titleByCode?: Partial<Record<string, string>>;
  descriptionByCode?: Partial<Record<string, string>>;
}

const INTERNAL_ERROR_COPY_PATTERNS = [
  /\bPrisma(?:Client\w*)?\b/iu,
  /\$queryRawUnsafe/iu,
  /\bmigration\b/iu,
  /\bschema\b/iu,
  /\bSQL\b/iu,
  /\bORM\b/iu,
  /\bdatabase\s+table\b/iu,
  /public\.custom_domain_binding/iu,
  /public\.custom_domain_talent_selection/iu,
  /\brelation\s+["'][^"']+["']\s+does\s+not\s+exist\b/iu,
  /\bstack\s+trace\b/iu,
] as const;

function containsInternalErrorCopy(message: string): boolean {
  return INTERNAL_ERROR_COPY_PATTERNS.some((pattern) => pattern.test(message));
}

function normalizeMessage(message: string | undefined, fallback: string): string {
  const trimmed = message?.trim();
  if (!trimmed || containsInternalErrorCopy(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function getApiErrorDisplayTraceId(error: Pick<ApiRequestError, 'requestId' | 'traceId'>): string | undefined {
  return error.traceId ?? error.requestId;
}

export function toSafeApiErrorView(reason: unknown, copy: SafeApiErrorCopy): SafeApiErrorView {
  if (reason instanceof ApiRequestError) {
    const code = reason.code || 'UNKNOWN_ERROR';
    return {
      code,
      traceId: getApiErrorDisplayTraceId(reason),
      title: copy.titleByCode?.[code] ?? copy.fallbackTitle,
      description:
        copy.descriptionByCode?.[code] ??
        normalizeMessage(reason.message, copy.fallbackDescription),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    title: copy.fallbackTitle,
    description: copy.fallbackDescription,
  };
}
