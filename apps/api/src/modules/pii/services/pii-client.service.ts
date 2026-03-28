// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestContext } from '@tcrn/shared';
import axios, { AxiosError, AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as https from 'https';

import { IntegrationLogService, type OutboundLogDto } from '../../log';

/**
 * PII Profile Data
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
  initialDelayMs: 3000,
  maxDelayMs: 15000,
  backoffMultiplier: 2.5,
  retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'],
  retryableHttpCodes: [408, 429, 500, 502, 503, 504],
};

@Injectable()
export class PiiClientService {
  private readonly logger = new Logger(PiiClientService.name);
  private httpClient: AxiosInstance | null = null;
  private httpsAgent: https.Agent | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationLogService: IntegrationLogService,
  ) {
    this.initializeClient();
  }

  /**
   * Initialize HTTP client with optional mTLS
   */
  private initializeClient(): void {
    // Check for mTLS certificates
    const certPath = this.configService.get<string>('PII_CLIENT_CERT_PATH');
    const keyPath = this.configService.get<string>('PII_CLIENT_KEY_PATH');
    const caPath = this.configService.get<string>('PII_CA_CERT_PATH');

    if (certPath && keyPath && caPath) {
      try {
        this.httpsAgent = new https.Agent({
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
          ca: fs.readFileSync(caPath),
          rejectUnauthorized: true,
        });
        this.logger.log('mTLS client configured');
      } catch {
        this.logger.warn('Failed to load mTLS certificates, using standard HTTPS');
      }
    }

    this.httpClient = axios.create({
      timeout: 30000,
      httpsAgent: this.httpsAgent ?? undefined,
    });
  }

  /**
   * Get a PII profile
   */
  async getProfile(
    piiServiceUrl: string,
    profileId: string,
    accessToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<PiiProfile> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiServiceUrl}/api/v1/profiles/${profileId}`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantId,
          },
        });

        await this.logOutbound({
          externalSystem: 'pii-service',
          endpoint: url,
          method: 'GET',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return response.data.data as PiiProfile;
      } catch (error) {
        await this.logError('GET', url, tenantId, error, startTime, tenantSchema);
        throw error;
      }
    });
  }

  /**
   * Create a PII profile
   */
  async createProfile(
    piiServiceUrl: string,
    profile: {
      id: string;
      profileStoreId: string;
      givenName?: string;
      familyName?: string;
      gender?: string;
      birthDate?: string;
      phoneNumbers?: PiiProfile['phoneNumbers'];
      emails?: PiiProfile['emails'];
      addresses?: PiiProfile['addresses'];
    },
    accessToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ id: string; createdAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiServiceUrl}/api/v1/profiles`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.post(url, profile, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'pii-service',
          endpoint: url,
          method: 'POST',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return response.data.data;
      } catch (error) {
        await this.logError('POST', url, tenantId, error, startTime, tenantSchema);
        throw error;
      }
    });
  }

  /**
   * Update a PII profile
   */
  async updateProfile(
    piiServiceUrl: string,
    profileId: string,
    updates: Partial<PiiProfile>,
    accessToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ id: string; updatedAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiServiceUrl}/api/v1/profiles/${profileId}`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.patch(url, updates, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'pii-service',
          endpoint: url,
          method: 'PATCH',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return response.data.data;
      } catch (error) {
        await this.logError('PATCH', url, tenantId, error, startTime, tenantSchema);
        throw error;
      }
    });
  }

  /**
   * Batch get PII profiles
   */
  async batchGetProfiles(
    piiServiceUrl: string,
    ids: string[],
    fields: string[] | undefined,
    accessToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{
    data: Record<string, PiiProfile>;
    errors: Record<string, { code: string; message: string }>;
  }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiServiceUrl}/api/v1/profiles/batch`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.post(
          url,
          { ids, fields },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Tenant-ID': tenantId,
              'Content-Type': 'application/json',
            },
          },
        );

        await this.logOutbound({
          externalSystem: 'pii-service',
          endpoint: url,
          method: 'POST',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          requestBody: { ids_count: ids.length, fields },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return {
          data: response.data.data || {},
          errors: response.data.errors || {},
        };
      } catch (error) {
        await this.logError('POST', url, tenantId, error, startTime, tenantSchema);
        throw error;
      }
    });
  }

  /**
   * Delete a PII profile
   */
  async deleteProfile(
    piiServiceUrl: string,
    profileId: string,
    accessToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiServiceUrl}/api/v1/profiles/${profileId}`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await this.httpClient!.delete(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantId,
          },
        });

        await this.logOutbound({
          externalSystem: 'pii-service',
          endpoint: url,
          method: 'DELETE',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: 200,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);
      } catch (error) {
        await this.logError('DELETE', url, tenantId, error, startTime, tenantSchema);
        throw error;
      }
    });
  }

  /**
   * Check PII service health
   */
  async checkHealth(piiServiceUrl: string): Promise<{
    status: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const url = `${piiServiceUrl}/health`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const response = await this.httpClient!.get(url, {
        timeout: 5000,
      });

      return {
        status: response.data.status,
        latencyMs: Date.now() - startTime,
      };
    } catch {
      return {
        status: 'error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.shouldRetry(error) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
          RETRY_CONFIG.maxDelayMs,
        );

        this.logger.warn(
          `PII service request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`,
        );

        await this.sleep(delay);
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof AxiosError) {
      // Network errors
      if (error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
        return true;
      }

      // HTTP status codes
      if (error.response && RETRY_CONFIG.retryableHttpCodes.includes(error.response.status)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Log error to integration log
   */
  private async logError(
    method: string,
    url: string,
    tenantId: string,
    error: unknown,
    startTime: number,
    tenantSchema?: string,
  ): Promise<void> {
    const axiosError = error as AxiosError;

    await this.logOutbound({
      externalSystem: 'pii-service',
      endpoint: url,
      method,
      requestHeaders: { 'X-Tenant-ID': tenantId },
      responseStatus: axiosError.response?.status || 0,
      responseHeaders: axiosError.response?.headers as Record<string, string>,
      responseBody: axiosError.response?.data,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: axiosError.message,
    }, tenantSchema);
  }

  private async logOutbound(
    data: OutboundLogDto,
    tenantSchema?: string,
  ): Promise<void> {
    if (tenantSchema) {
      await this.integrationLogService.logOutbound(data, {
        tenantSchema,
      } as RequestContext);
      return;
    }

    await this.integrationLogService.logOutbound(data);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
