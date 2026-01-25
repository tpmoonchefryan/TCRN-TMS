// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Readable } from 'stream';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

/**
 * Bucket names as per PRD §20.1 and architecture doc
 */
export const BUCKETS = {
  IMPORTS: 'imports',
  TEMP_REPORTS: 'temp-reports',
  AVATARS: 'avatars',
  HOMEPAGE_ASSETS: 'homepage-assets',
  ATTACHMENTS: 'attachments',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * MinIO Service
 * Provides object storage operations
 * PRD §20.1: Stream upload, presigned URLs
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Client;
  private readonly bucketRegion = 'us-east-1'; // Default region

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
    const [endpointHost, endpointPort] = endpoint.split(':');

    this.client = new Client({
      endPoint: endpointHost,
      port: parseInt(endpointPort || '9000', 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ROOT_USER', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD', ''),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      // Create all required buckets
      for (const bucketName of Object.values(BUCKETS)) {
        await this.ensureBucket(bucketName);
      }

      // Set lifecycle policy for temp-reports (PRD §20.6)
      await this.setTempReportsLifecycle();

      this.logger.log('MinIO connected and buckets initialized');
    } catch (error) {
      this.logger.error('MinIO initialization failed', error);
    }
  }

  /**
   * Get the MinIO client instance
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.listBuckets();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure bucket exists
   */
  private async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, this.bucketRegion);
      this.logger.log(`Created bucket: ${bucketName}`);
    }
  }

  /**
   * Set lifecycle policy for temp-reports bucket
   * PRD §20.6: Delete objects older than 1 day
   */
  private async setTempReportsLifecycle(): Promise<void> {
    // Use the proper MinIO SDK format for lifecycle configuration
    const lifecycleConfig = {
      Rule: [
        {
          ID: 'ExpireTempReports',
          Status: 'Enabled',
          Filter: {
            Prefix: '',
          },
          Expiration: {
            Days: 1,
          },
        },
      ],
    };

    try {
      await this.client.setBucketLifecycle(BUCKETS.TEMP_REPORTS, lifecycleConfig);
    } catch (error: any) {
      // MinIO might not support lifecycle in dev mode, log as info not error
      if (error?.code === 'InvalidArgument' || error?.code === 'NotImplemented') {
        this.logger.log('MinIO lifecycle policy not supported in this environment');
      } else {
        this.logger.warn(`Could not set temp-reports lifecycle policy: ${error?.message}`);
      }
    }
  }

  // ==========================================================================
  // Upload Operations
  // ==========================================================================

  /**
   * Upload file from buffer
   */
  async uploadFile(
    bucket: BucketName,
    objectName: string,
    data: Buffer,
    contentType?: string
  ): Promise<string> {
    const metadata = contentType ? { 'Content-Type': contentType } : {};
    await this.client.putObject(bucket, objectName, data, data.length, metadata);
    return objectName;
  }

  /**
   * Upload file from stream (PRD §20.1: Stream upload)
   */
  async uploadStream(
    bucket: BucketName,
    objectName: string,
    stream: Readable,
    size?: number,
    contentType?: string
  ): Promise<string> {
    const metadata = contentType ? { 'Content-Type': contentType } : {};
    await this.client.putObject(bucket, objectName, stream, size, metadata);
    return objectName;
  }

  /**
   * Upload import file
   */
  async uploadImportFile(
    tenantSchema: string,
    jobId: string,
    stream: Readable,
    size: number
  ): Promise<string> {
    const objectName = `${tenantSchema}/${jobId}.csv`;
    return this.uploadStream(BUCKETS.IMPORTS, objectName, stream, size, 'text/csv');
  }

  /**
   * Upload report file
   */
  async uploadReportFile(
    tenantSchema: string,
    jobId: string,
    stream: Readable,
    size?: number
  ): Promise<string> {
    const objectName = `${tenantSchema}/${jobId}.xlsx`;
    return this.uploadStream(
      BUCKETS.TEMP_REPORTS,
      objectName,
      stream,
      size,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  // ==========================================================================
  // Download Operations
  // ==========================================================================

  /**
   * Get file as stream
   */
  async getFileStream(bucket: BucketName, objectName: string): Promise<Readable> {
    return this.client.getObject(bucket, objectName);
  }

  /**
   * Get file as buffer
   */
  async getFile(bucket: BucketName, objectName: string): Promise<Buffer> {
    const stream = await this.getFileStream(bucket, objectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // ==========================================================================
  // Presigned URL Operations (PRD §20.1)
  // ==========================================================================

  /**
   * Generate presigned URL for download
   * PRD §20.1: 15 minutes expiry
   */
  async getPresignedUrl(
    bucket: BucketName,
    objectName: string,
    expirySeconds: number = 900 // 15 minutes
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }

  /**
   * Generate presigned URL for upload
   */
  async getPresignedPutUrl(
    bucket: BucketName,
    objectName: string,
    expirySeconds: number = 300 // 5 minutes
  ): Promise<string> {
    return this.client.presignedPutObject(bucket, objectName, expirySeconds);
  }

  /**
   * Generate presigned URL for report download
   */
  async getReportPresignedUrl(
    tenantSchema: string,
    jobId: string,
    expirySeconds: number = 900
  ): Promise<string> {
    const objectName = `${tenantSchema}/${jobId}.xlsx`;
    return this.getPresignedUrl(BUCKETS.TEMP_REPORTS, objectName, expirySeconds);
  }

  // ==========================================================================
  // Delete Operations
  // ==========================================================================

  /**
   * Delete file
   */
  async deleteFile(bucket: BucketName, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: BucketName, objectNames: string[]): Promise<void> {
    await this.client.removeObjects(bucket, objectNames);
  }

  // ==========================================================================
  // Utility Operations
  // ==========================================================================

  /**
   * Check if file exists
   */
  async fileExists(bucket: BucketName, objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(
    bucket: BucketName,
    objectName: string
  ): Promise<{ size: number; lastModified: Date } | null> {
    try {
      const stat = await this.client.statObject(bucket, objectName);
      return {
        size: stat.size,
        lastModified: stat.lastModified,
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in bucket with prefix
   */
  async listFiles(
    bucket: BucketName,
    prefix: string = '',
    recursive: boolean = false
  ): Promise<string[]> {
    const objects: string[] = [];
    const stream = this.client.listObjects(bucket, prefix, recursive);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) {
          objects.push(obj.name);
        }
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }
}
