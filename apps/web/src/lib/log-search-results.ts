// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { LokiSearchEntry } from '@/lib/api/modules/security';

export interface LogSearchResult {
  timestamp: string;
  level: string;
  message: string;
  labels: Record<string, string>;
}

export function mapLokiSearchEntry(entry: LokiSearchEntry): LogSearchResult {
  const payload = asRecord(entry.data);

  return {
    timestamp: entry.timestamp,
    level:
      entry.labels.severity ||
      getString(payload, 'level') ||
      getString(payload, 'severity') ||
      'info',
    message: getPrimaryMessage(entry.data, payload),
    labels: entry.labels,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(value: Record<string, unknown> | null, key: string): string | undefined {
  const candidate = value?.[key];
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate : undefined;
}

function getPrimaryMessage(data: unknown, payload: Record<string, unknown> | null): string {
  const directMessage =
    getString(payload, 'message') ||
    getString(payload, 'msg') ||
    getString(payload, 'eventType') ||
    getString(payload, 'action');

  if (directMessage) {
    return directMessage;
  }

  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data, null, 2) ?? String(data);
}
