// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../api/client';

/**
 * PII Token Response from backend
 */
interface PiiTokenResponse {
  accessToken: string;
  piiProfileId: string;
  piiServiceUrl: string;
  expiresIn: number; // seconds
}

/**
 * Cached token entry
 */
interface TokenCacheEntry {
  token: string;
  piiProfileId: string;
  piiServiceUrl: string;
  expiresAt: number; // timestamp in ms
}

/**
 * PII Profile data structure
 */
export interface PiiProfile {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  phoneNumbers?: Array<{
    typeCode: string;
    number: string;
    isPrimary?: boolean;
  }> | null;
  emails?: Array<{
    typeCode: string;
    address: string;
    isPrimary?: boolean;
  }> | null;
  addresses?: Array<{
    typeCode: string;
    countryCode: string;
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    postalCode?: string;
    isPrimary?: boolean;
  }> | null;
  updatedAt?: string;
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 3000,      // 3 seconds
  maxDelayMs: 15000,         // 15 seconds
  backoffMultiplier: 2.5,
  retryableHttpCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * PII Token Manager
 * 
 * Manages PII access tokens with automatic caching and renewal.
 * Tokens are scoped per customer profile and have a 5-minute TTL.
 * 
 * Usage:
 * ```typescript
 * const tokenManager = PiiTokenManager.getInstance();
 * const piiData = await tokenManager.getPiiProfile(customerId, talentId);
 * ```
 */
export class PiiTokenManager {
  private static instance: PiiTokenManager | null = null;
  private tokenCache: Map<string, TokenCacheEntry> = new Map();
  private readonly refreshThresholdMs = 60 * 1000; // Refresh 1 minute before expiry

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PiiTokenManager {
    if (!PiiTokenManager.instance) {
      PiiTokenManager.instance = new PiiTokenManager();
    }
    return PiiTokenManager.instance;
  }

  /**
   * Get PII token for a customer
   * Returns cached token if still valid, otherwise fetches a new one
   */
  async getToken(customerId: string, talentId: string): Promise<TokenCacheEntry> {
    const cacheKey = this.getCacheKey(customerId, talentId);
    const cached = this.tokenCache.get(cacheKey);

    // Return cached token if still valid
    if (cached && !this.shouldRefresh(cached)) {
      return cached;
    }

    // Fetch new token
    const tokenData = await this.fetchToken(customerId, talentId);
    const entry: TokenCacheEntry = {
      token: tokenData.accessToken,
      piiProfileId: tokenData.piiProfileId,
      piiServiceUrl: tokenData.piiServiceUrl,
      expiresAt: Date.now() + tokenData.expiresIn * 1000,
    };

    this.tokenCache.set(cacheKey, entry);
    return entry;
  }

  /**
   * Get PII profile data with automatic token management
   */
  async getPiiProfile(
    customerId: string,
    talentId: string,
    options?: {
      onRetry?: (attempt: number, delayMs: number) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<PiiProfile> {
    return this.executeWithRetry(async () => {
      const tokenEntry = await this.getToken(customerId, talentId);
      return this.fetchPiiProfile(tokenEntry);
    }, options);
  }

  /**
   * Update PII profile data
   */
  async updatePiiProfile(
    customerId: string,
    talentId: string,
    updates: Partial<PiiProfile>,
    options?: {
      onRetry?: (attempt: number, delayMs: number) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<{ id: string; updatedAt: string }> {
    return this.executeWithRetry(async () => {
      const tokenEntry = await this.getToken(customerId, talentId);
      return this.submitPiiUpdate(tokenEntry, updates);
    }, options);
  }

  /**
   * Clear token cache for a specific customer or all tokens
   */
  clearCache(customerId?: string, talentId?: string): void {
    if (customerId && talentId) {
      const cacheKey = this.getCacheKey(customerId, talentId);
      this.tokenCache.delete(cacheKey);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Generate cache key from customer ID and talent ID
   */
  private getCacheKey(customerId: string, talentId: string): string {
    return `${customerId}:${talentId}`;
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefresh(entry: TokenCacheEntry): boolean {
    return entry.expiresAt - Date.now() < this.refreshThresholdMs;
  }

  /**
   * Fetch PII access token from backend
   */
  private async fetchToken(customerId: string, talentId: string): Promise<PiiTokenResponse> {
    const response = await apiClient.post<PiiTokenResponse>(
      `/api/v1/customers/individuals/${customerId}/request-pii-access`,
      {},
      { 'X-Talent-Id': talentId }
    );

    if (!response.data) {
      throw new Error('Failed to obtain PII access token');
    }

    return response.data;
  }

  /**
   * Fetch PII profile from PII service
   */
  private async fetchPiiProfile(tokenEntry: TokenCacheEntry): Promise<PiiProfile> {
    const url = `${tokenEntry.piiServiceUrl}/api/v1/profiles/${tokenEntry.piiProfileId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenEntry.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new PiiServiceError(
        error.message || `PII service error: ${response.status}`,
        response.status
      );
    }

    const result = await response.json();
    return result.data as PiiProfile;
  }

  /**
   * Submit PII update to PII service
   */
  private async submitPiiUpdate(
    tokenEntry: TokenCacheEntry,
    updates: Partial<PiiProfile>
  ): Promise<{ id: string; updatedAt: string }> {
    const url = `${tokenEntry.piiServiceUrl}/api/v1/profiles/${tokenEntry.piiProfileId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenEntry.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new PiiServiceError(
        error.message || `PII service error: ${response.status}`,
        response.status
      );
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Execute operation with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: {
      onRetry?: (attempt: number, delayMs: number) => void;
      onError?: (error: Error) => void;
    },
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const err = error as Error;
      
      if (this.shouldRetry(err) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
          RETRY_CONFIG.maxDelayMs
        );

        options?.onRetry?.(retryCount + 1, delay);

        await this.sleep(delay);
        return this.executeWithRetry(operation, options, retryCount + 1);
      }

      options?.onError?.(err);
      throw err;
    }
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: Error): boolean {
    if (error instanceof PiiServiceError) {
      return RETRY_CONFIG.retryableHttpCodes.includes(error.statusCode);
    }
    
    // Retry on network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Custom error for PII service failures
 */
export class PiiServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'PiiServiceError';
  }
}

/**
 * Export singleton instance getter
 */
export const piiTokenManager = PiiTokenManager.getInstance();
