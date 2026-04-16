// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestContext } from '@tcrn/shared';
import axios, { AxiosError, AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as https from 'https';

import type {
  CustomerPiiPlatformLifecyclePayload,
  CustomerPiiPlatformPortalSessionPayload,
  CustomerPiiPlatformWritePayload,
} from '../../customer/domain/pii-platform.policy';
import { IntegrationLogService, type OutboundLogDto } from '../../log';
import type { ReportPiiPlatformRequestPayload } from '../../report/domain/report-pii-platform.policy';

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

  async upsertCustomerPii(
    piiPlatformUrl: string,
    payload: CustomerPiiPlatformWritePayload,
    serviceToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ customerId: string; syncedAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiPlatformUrl}/api/v1/tms/customers/${payload.customerId}/pii`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.put(url, payload, {
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'tcrn-pii-platform',
          endpoint: url,
          method: 'PUT',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return response.data.data;
      } catch (error) {
        await this.logError(
          'PUT',
          url,
          tenantId,
          error,
          startTime,
          tenantSchema,
          'tcrn-pii-platform',
        );
        throw error;
      }
    });
  }

  async createPortalSession(
    piiPlatformUrl: string,
    payload: CustomerPiiPlatformPortalSessionPayload,
    serviceToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ redirectUrl: string; expiresAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiPlatformUrl}/api/v1/tms/portal-sessions`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.post(url, payload, {
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'tcrn-pii-platform',
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
        await this.logError(
          'POST',
          url,
          tenantId,
          error,
          startTime,
          tenantSchema,
          'tcrn-pii-platform',
        );
        throw error;
      }
    });
  }

  async syncCustomerLifecycle(
    piiPlatformUrl: string,
    payload: CustomerPiiPlatformLifecyclePayload,
    serviceToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ customerId: string; lifecycleStatus: 'active' | 'inactive'; syncedAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiPlatformUrl}/api/v1/tms/customers/${payload.customerId}/lifecycle`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.put(url, payload, {
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'tcrn-pii-platform',
          endpoint: url,
          method: 'PUT',
          requestHeaders: { 'X-Tenant-ID': tenantId },
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, string>,
          latencyMs: Date.now() - startTime,
          success: true,
        }, tenantSchema);

        return response.data.data;
      } catch (error) {
        await this.logError(
          'PUT',
          url,
          tenantId,
          error,
          startTime,
          tenantSchema,
          'tcrn-pii-platform',
        );
        throw error;
      }
    });
  }

  async createReportRequest(
    piiPlatformUrl: string,
    payload: ReportPiiPlatformRequestPayload,
    serviceToken: string,
    tenantId: string,
    tenantSchema?: string,
  ): Promise<{ requestId: string; redirectUrl: string; expiresAt: string }> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      const url = `${piiPlatformUrl}/api/v1/tms/report-requests`;

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const response = await this.httpClient!.post(url, payload, {
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json',
          },
        });

        await this.logOutbound({
          externalSystem: 'tcrn-pii-platform',
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
        await this.logError(
          'POST',
          url,
          tenantId,
          error,
          startTime,
          tenantSchema,
          'tcrn-pii-platform',
        );
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
    externalSystem: string = 'pii-service',
  ): Promise<void> {
    const axiosError = error as AxiosError;

    await this.logOutbound({
      externalSystem,
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
