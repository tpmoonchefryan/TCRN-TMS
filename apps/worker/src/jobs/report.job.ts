// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Job Processor (PRD §20)

import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

import { Prisma, PrismaClient } from '@tcrn/database';
import axios, { AxiosInstance } from 'axios';
import type { Job, Processor } from 'bullmq';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';
import * as Minio from 'minio';

import { reportLogger as logger } from '../logger';

/**
 * MinIO client configuration from environment
 */
function createMinioClient(): Minio.Client {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const [endpointHost, endpointPort] = endpoint.split(':');
  
  return new Minio.Client({
    endPoint: endpointHost,
    port: parseInt(endpointPort || '9000', 10),
    useSSL: process.env.NODE_ENV === 'production',
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || '',
  });
}

const TEMP_REPORTS_BUCKET = 'temp-reports';
const PII_BATCH_SIZE = 200;

/**
 * Address interface for PII
 */
interface PiiAddress {
  typeCode: string;
  countryCode: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  postalCode?: string;
  isPrimary?: boolean;
}

/**
 * PII Profile interface
 */
interface PiiProfile {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  phoneNumbers?: Array<{ number: string; isPrimary?: boolean }> | null;
  emails?: Array<{ address: string; isPrimary?: boolean }> | null;
  addresses?: PiiAddress[] | null;
}

/**
 * Sign Service JWT for PII access (PRD §20)
 * Valid for 30 minutes
 */
function signServiceJwt(
  jobId: string,
  tenantId: string,
  profileStoreId: string,
  originalUserId: string
): string {
  const secret = process.env.PII_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('PII_JWT_SECRET or JWT_SECRET environment variable is required');
  }
  
  const payload = {
    sub: 'report-service',
    tid: tenantId,
    type: 'report_service',
    job_id: jobId,
    original_user_id: originalUserId,
    psi: profileStoreId,
    act: ['batch_read'],
  };
  
  return jwt.sign(payload, secret, { expiresIn: '30m' });
}

/**
 * Create PII HTTP client
 */
function createPiiClient(): AxiosInstance {
  const certPath = process.env.PII_CLIENT_CERT_PATH;
  const keyPath = process.env.PII_CLIENT_KEY_PATH;
  const caPath = process.env.PII_CA_CERT_PATH;
  
  let httpsAgent: https.Agent | undefined;
  
  if (certPath && keyPath && caPath) {
    try {
      httpsAgent = new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true,
      });
    } catch {
      logger.warn('Failed to load mTLS certificates, using standard HTTPS');
    }
  }
  
  return axios.create({
    timeout: 30000,
    httpsAgent,
  });
}

/**
 * Batch get PII profiles from PII service
 */
async function batchGetPiiProfiles(
  piiServiceUrl: string,
  ids: string[],
  accessToken: string,
  tenantId: string
): Promise<Map<string, PiiProfile>> {
  const client = createPiiClient();
  const result = new Map<string, PiiProfile>();
  
  if (ids.length === 0) {
    return result;
  }
  
  try {
    const response = await client.post(
      `${piiServiceUrl}/api/v1/profiles/batch`,
      {
        ids,
        fields: ['givenName', 'familyName', 'phoneNumbers', 'emails', 'addresses'],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = response.data.data || {};
    for (const [id, profile] of Object.entries(data)) {
      result.set(id, profile as PiiProfile);
    }
    
    logger.info(`Fetched ${result.size} PII profiles`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to fetch PII profiles: ${errorMessage}`);
    // Don't throw - we'll handle missing PII gracefully
  }
  
  return result;
}

/**
 * Get PII service URL for a profile store
 */
async function getPiiServiceUrl(
  prisma: PrismaClient,
  profileStoreId: string
): Promise<string | null> {
  const result = await prisma.profileStore.findUnique({
    where: { id: profileStoreId },
    select: { 
      piiProxyUrl: true,
      piiServiceConfig: {
        select: { apiUrl: true }
      }
    },
  });
  // Try piiServiceConfig.apiUrl first, then piiProxyUrl, then env var
  return result?.piiServiceConfig?.apiUrl || result?.piiProxyUrl || process.env.PII_SERVICE_URL || null;
}

/**
 * Report format options
 */
export type ReportFormat = 'xlsx' | 'csv';

/**
 * Report job data interface (PRD §20)
 */
export interface ReportJobData {
  jobId: string;
  reportType: 'mfr'; // Membership Feedback Report
  format?: ReportFormat; // Output format (default: xlsx)
  tenantId: string;
  tenantSchemaName: string;
  userId: string;
  talentId?: string;
  profileStoreId?: string;
  filters: {
    platformCodes?: string[];
    membershipClassCodes?: string[];
    membershipTypeCodes?: string[];
    membershipLevelCodes?: string[];
    customerStatusCodes?: string[];
    dateFrom?: string;
    dateTo?: string;
    includeHistory?: boolean;
    includeInactive?: boolean;
  };
  options?: {
    includePii?: boolean; // Requires additional permission check
    language?: 'en' | 'zh' | 'ja';
  };
}

/**
 * Report job result
 */
export interface ReportJobResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  generatedAt: string;
}

/**
 * MFR Row interface
 */
interface MfrRow {
  customerNickname: string;
  profileType: string;
  platformName: string;
  platformUid: string;
  membershipClass: string;
  membershipType: string;
  membershipLevel: string;
  validFrom: string;
  validTo: string;
  autoRenew: boolean;
  isExpired: boolean;
  customerStatus: string;
  tags: string;
  source: string;
  createdAt: string;
  // PII fields (optional, require permission)
  realName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Report job processor (PRD §20)
 */
export const reportJobProcessor: Processor<ReportJobData, ReportJobResult> = async (
  job: Job<ReportJobData, ReportJobResult>
) => {
  const { jobId, reportType, tenantId, tenantSchemaName, userId: _userId, talentId, profileStoreId, filters, options } = job.data;
  const startTime = Date.now();

  logger.info(`Processing report job ${jobId} type ${reportType} for tenant ${tenantId}`);
  logger.info(`Filters: ${JSON.stringify(filters)}`);

  const prisma = new PrismaClient();

  try {
    // 1. Update job status to processing
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'processing');

    // 2. Build query filters
    const whereConditions: Prisma.MembershipRecordWhereInput = {
      customer: {
        talentId: talentId || undefined,
        profileStoreId: profileStoreId || undefined,
        isActive: filters.includeInactive ? undefined : true,
        status: filters.customerStatusCodes?.length
          ? { code: { in: filters.customerStatusCodes } }
          : undefined,
      },
      platform: filters.platformCodes?.length
        ? { code: { in: filters.platformCodes } }
        : undefined,
      membershipClass: filters.membershipClassCodes?.length
        ? { code: { in: filters.membershipClassCodes } }
        : undefined,
      membershipType: filters.membershipTypeCodes?.length
        ? { code: { in: filters.membershipTypeCodes } }
        : undefined,
      membershipLevel: filters.membershipLevelCodes?.length
        ? { code: { in: filters.membershipLevelCodes } }
        : undefined,
      validFrom: filters.dateFrom
        ? { gte: new Date(filters.dateFrom) }
        : undefined,
      validTo: filters.dateTo
        ? { lte: new Date(filters.dateTo) }
        : undefined,
    };

    // 3. Count total records for progress tracking
    const totalCount = await prisma.membershipRecord.count({
      where: whereConditions,
    });

    logger.info(`Total records to process: ${totalCount}`);

    // 4. Create Excel workbook with streaming
    const tempFilePath = path.join(os.tmpdir(), `mfr_${jobId}.xlsx`);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: tempFilePath,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Membership Feedback Report', {
      properties: { defaultRowHeight: 20 },
    });

    // 5. Setup headers
    const language = options?.language || 'en';
    const headers = getHeaders(language, options?.includePii || false);
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 6. Prepare PII access if needed
    let piiServiceUrl: string | null = null;
    let serviceJwt: string | null = null;
    
    if (options?.includePii && profileStoreId) {
      piiServiceUrl = await getPiiServiceUrl(prisma, profileStoreId);
      if (piiServiceUrl) {
        serviceJwt = signServiceJwt(jobId, tenantId, profileStoreId, job.data.userId);
        logger.info('PII access configured for report');
      } else {
        logger.warn('PII service URL not found, PII fields will be empty');
      }
    }

    // 7. Stream data in batches
    const batchSize = 1000;
    let processedCount = 0;

    for (let skip = 0; skip < totalCount; skip += batchSize) {
      const records = await prisma.membershipRecord.findMany({
        where: whereConditions,
        include: {
          customer: {
            include: {
              status: true,
            },
          },
          platform: true,
          membershipClass: true,
          membershipType: true,
          membershipLevel: true,
        },
        skip,
        take: batchSize,
        orderBy: { createdAt: 'desc' },
      });

      // Batch fetch PII if needed
      const piiMap = new Map<string, PiiProfile>();
      if (options?.includePii && piiServiceUrl && serviceJwt) {
        // Collect rm_profile_ids for PII lookup (rmProfileId is on CustomerProfile)
        const rmProfileIds = records
          .filter(r => r.customer.profileType === 'individual' && r.customer.rmProfileId)
          .map(r => r.customer.rmProfileId);
        
        // Fetch in sub-batches of PII_BATCH_SIZE
        for (let i = 0; i < rmProfileIds.length; i += PII_BATCH_SIZE) {
          const batch = rmProfileIds.slice(i, i + PII_BATCH_SIZE);
          const batchResult = await batchGetPiiProfiles(piiServiceUrl, batch, serviceJwt, tenantId);
          batchResult.forEach((v, k) => piiMap.set(k, v));
        }
      }

      for (const record of records) {
        // Get PII data if available (rmProfileId is on CustomerProfile)
        const rmProfileId = record.customer.rmProfileId;
        const pii = rmProfileId ? piiMap.get(rmProfileId) : undefined;
        
        const row: MfrRow = {
          customerNickname: record.customer.nickname,
          profileType: record.customer.profileType,
          platformName: getLocalizedName(record.platform, language),
          platformUid: '', // Would need to fetch from platform_identity
          membershipClass: getLocalizedName(record.membershipClass, language),
          membershipType: getLocalizedName(record.membershipType, language),
          membershipLevel: getLocalizedName(record.membershipLevel, language),
          validFrom: record.validFrom.toISOString().split('T')[0],
          validTo: record.validTo?.toISOString().split('T')[0] || '',
          autoRenew: record.autoRenew,
          isExpired: record.isExpired,
          customerStatus: record.customer.status
            ? getLocalizedName(record.customer.status, language)
            : '',
          tags: record.customer.tags.join(', '),
          source: record.customer.source || '',
          createdAt: record.createdAt.toISOString().split('T')[0],
        };

        // Add PII fields if permitted
        if (options?.includePii) {
          if (pii) {
            row.realName = [pii.familyName, pii.givenName].filter(Boolean).join('') || '';
            row.email = pii.emails?.find(e => e.isPrimary)?.address || pii.emails?.[0]?.address || '';
            row.phone = pii.phoneNumbers?.find(p => p.isPrimary)?.number || pii.phoneNumbers?.[0]?.number || '';
            // Format primary address
            const primaryAddress = pii.addresses?.find(a => a.isPrimary) || pii.addresses?.[0];
            if (primaryAddress) {
              row.address = formatAddress(primaryAddress);
            } else {
              row.address = '';
            }
          } else {
            row.realName = '';
            row.email = '';
            row.phone = '';
            row.address = '';
          }
        }

        worksheet.addRow(row).commit();
        processedCount++;
      }

      // Update progress (BullMQ and database)
      const progress = Math.round((processedCount / totalCount) * 100);
      await job.updateProgress(progress);
      await updateJobProgress(prisma, tenantSchemaName, jobId, processedCount, progress);
      logger.info(`Progress: ${progress}% (${processedCount}/${totalCount})`);
    }

    // 7. Finalize workbook
    await workbook.commit();

    // 8. Get file stats
    const stats = fs.statSync(tempFilePath);
    const fileName = `MFR_${tenantId}_${new Date().toISOString().replace(/[:-]/g, '').split('.')[0]}.xlsx`;

    // 9. Upload to MinIO
    const minioClient = createMinioClient();
    const objectPath = `${tenantSchemaName}/${jobId}/${fileName}`;
    
    logger.info(`Uploading to MinIO bucket: ${TEMP_REPORTS_BUCKET}, path: ${objectPath}`);
    
    // Ensure bucket exists
    const bucketExists = await minioClient.bucketExists(TEMP_REPORTS_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(TEMP_REPORTS_BUCKET, 'us-east-1');
      logger.info(`Created bucket: ${TEMP_REPORTS_BUCKET}`);
    }
    
    // Upload file stream
    const fileStream = fs.createReadStream(tempFilePath);
    await minioClient.putObject(
      TEMP_REPORTS_BUCKET,
      objectPath,
      fileStream,
      stats.size,
      { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    
    logger.info(`Successfully uploaded to MinIO: ${objectPath}`);

    // 10. Update job record with result
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'completed', {
      fileUrl: objectPath,
      fileName,
      fileSize: stats.size,
      rowCount: processedCount,
    });

    // 11. Cleanup temp file
    fs.unlinkSync(tempFilePath);

    const duration = Date.now() - startTime;
    logger.info(`Report job ${jobId} completed in ${duration}ms`);

    return {
      filePath: objectPath,
      fileName,
      fileSize: stats.size,
      rowCount: processedCount,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Report job ${jobId} failed: ${errorMessage}`);

    // Update job status to failed
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'failed', {
      errorMessage: errorMessage,
    });

    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Get localized name
 */
function getLocalizedName(
  entity: { nameEn: string; nameZh?: string | null; nameJa?: string | null },
  language: string
): string {
  switch (language) {
    case 'zh':
      return entity.nameZh || entity.nameEn;
    case 'ja':
      return entity.nameJa || entity.nameEn;
    default:
      return entity.nameEn;
  }
}

/**
 * Format address into a single string
 */
function formatAddress(addr: PiiAddress): string {
  const parts: string[] = [];
  
  // Build address string: Country Province City District Street PostalCode
  if (addr.countryCode) parts.push(addr.countryCode);
  if (addr.province) parts.push(addr.province);
  if (addr.city) parts.push(addr.city);
  if (addr.district) parts.push(addr.district);
  if (addr.street) parts.push(addr.street);
  if (addr.postalCode) parts.push(addr.postalCode);
  
  return parts.join(' ');
}

/**
 * Get headers based on language and PII inclusion
 */
function getHeaders(language: string, includePii: boolean) {
  const baseHeaders = [
    { key: 'customerNickname', width: 20, label: { en: 'Nickname', zh: '昵称', ja: 'ニックネーム' }[language] },
    { key: 'profileType', width: 12, label: { en: 'Type', zh: '类型', ja: 'タイプ' }[language] },
    { key: 'platformName', width: 15, label: { en: 'Platform', zh: '平台', ja: 'プラットフォーム' }[language] },
    { key: 'platformUid', width: 20, label: { en: 'Platform UID', zh: '平台UID', ja: 'プラットフォームUID' }[language] },
    { key: 'membershipClass', width: 15, label: { en: 'Class', zh: '类别', ja: 'クラス' }[language] },
    { key: 'membershipType', width: 15, label: { en: 'Type', zh: '类型', ja: 'タイプ' }[language] },
    { key: 'membershipLevel', width: 15, label: { en: 'Level', zh: '等级', ja: 'レベル' }[language] },
    { key: 'validFrom', width: 12, label: { en: 'Valid From', zh: '生效日期', ja: '開始日' }[language] },
    { key: 'validTo', width: 12, label: { en: 'Valid To', zh: '到期日期', ja: '終了日' }[language] },
    { key: 'autoRenew', width: 10, label: { en: 'Auto Renew', zh: '自动续费', ja: '自動更新' }[language] },
    { key: 'isExpired', width: 10, label: { en: 'Expired', zh: '已过期', ja: '期限切れ' }[language] },
    { key: 'customerStatus', width: 12, label: { en: 'Status', zh: '状态', ja: 'ステータス' }[language] },
    { key: 'tags', width: 25, label: { en: 'Tags', zh: '标签', ja: 'タグ' }[language] },
    { key: 'source', width: 15, label: { en: 'Source', zh: '来源', ja: '取得元' }[language] },
    { key: 'createdAt', width: 12, label: { en: 'Created', zh: '创建时间', ja: '作成日' }[language] },
  ];

  if (includePii) {
    baseHeaders.push(
      { key: 'realName', width: 15, label: { en: 'Real Name', zh: '真实姓名', ja: '本名' }[language] },
      { key: 'email', width: 25, label: { en: 'Email', zh: '邮箱', ja: 'メール' }[language] },
      { key: 'phone', width: 15, label: { en: 'Phone', zh: '电话', ja: '電話' }[language] },
      { key: 'address', width: 40, label: { en: 'Address', zh: '地址', ja: '住所' }[language] }
    );
  }

  return baseHeaders;
}

/**
 * Update job status in database
 */
/**
 * Update job progress in database
 */
async function updateJobProgress(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  processedRows: number,
  progressPercentage: number
) {
  await prisma.$executeRawUnsafe(`
    UPDATE "${schemaName}".report_job
    SET processed_rows = $1, progress_percentage = $2
    WHERE id = $3
  `, processedRows, progressPercentage, jobId);
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  status: string,
  data?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    rowCount?: number;
    errorMessage?: string;
  }
) {
  // Use raw query to update in tenant schema
  const now = new Date();
  
  if (status === 'processing') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".report_job
      SET status = $1, started_at = $2
      WHERE id = $3
    `, 'running', now, jobId);
  } else if (status === 'completed') {
    // PRD §20: 15 minutes expiry after completion
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".report_job
      SET status = $1, 
          completed_at = $2, 
          file_path = $3, 
          file_name = $4, 
          file_size_bytes = $5, 
          processed_rows = $6,
          progress_percentage = 100,
          expires_at = $7
      WHERE id = $8
    `, 'success', now, data?.fileUrl, data?.fileName, data?.fileSize, data?.rowCount, 
       expiresAt, jobId);
  } else if (status === 'failed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".report_job
      SET status = $1, 
          completed_at = $2, 
          error_message = $3
      WHERE id = $4
    `, 'failed', now, data?.errorMessage, jobId);
  }
}
