// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { workerLogger as logger } from '../logger';

interface PiiProfile {
  id: string;
  emails?: string[];
  phones?: string[];
  name?: string;
}

interface PiiClient {
  getProfile(profileId: string): Promise<PiiProfile | null>;
}

let piiClient: PiiClient | null = null;

/**
 * Simple PII Client for Worker
 * Calls PII Service HTTP API to retrieve profile data
 */
class SimplePiiClient implements PiiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getProfile(profileId: string): Promise<PiiProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, this should include proper authentication
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`PII Service error: ${response.status}`);
      }

      const data = await response.json();
      return data as PiiProfile;
    } catch (error) {
      logger.error(`[PiiClient] Failed to get profile ${profileId}:`, error);
      throw error;
    }
  }
}

/**
 * Get or create PII client instance
 */
export function getPiiClient(): PiiClient | null {
  if (piiClient) {
    return piiClient;
  }

  const piiServiceUrl = process.env.PII_SERVICE_URL;
  if (!piiServiceUrl) {
    logger.warn('[PiiClient] PII_SERVICE_URL not configured');
    return null;
  }

  piiClient = new SimplePiiClient(piiServiceUrl);
  logger.info(`[PiiClient] Initialized with URL: ${piiServiceUrl}`);
  return piiClient;
}
