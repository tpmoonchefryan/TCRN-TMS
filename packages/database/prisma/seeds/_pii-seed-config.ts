// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export interface DefaultPiiSeedConfig {
  apiUrl: string;
  healthCheckUrl: string;
}

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

/**
 * Resolve the default PII endpoint for seed data.
 *
 * The source of truth is the environment, not a hard-coded localhost port.
 * When no PII service URL is configured, callers should seed local-only mode.
 */
export function getDefaultPiiSeedConfig(): DefaultPiiSeedConfig | null {
  const apiUrl = normalizeUrl(process.env.PII_SERVICE_URL);
  if (!apiUrl) {
    return null;
  }

  return {
    apiUrl,
    healthCheckUrl: `${apiUrl}/health`,
  };
}
