// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Job Processor (PRD §20)

import { Prisma, PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as Minio from 'minio';
import * as os from 'os';
import * as path from 'path';

import { reportLogger as logger } from '../logger';

/**
 * MinIO client configuration from environment
 */
function createMinioClient(): Minio.Client {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const [endpointHost, endpointPort] = endpoint.split(':');
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  
  return new Minio.Client({
    endPoint: endpointHost,
    port: parseInt(endpointPort || '9000', 10),
    useSSL,
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || '',
  });
}

const TEMP_REPORTS_BUCKET = 'temp-reports';

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
}

interface ReportHeader {
  key: keyof MfrRow;
  width: number;
  label: string;
}

function getContentType(format: ReportFormat): string {
  return format === 'csv'
    ? 'text/csv'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function buildCsvRow(headers: ReportHeader[], row: MfrRow): string {
  return headers.map((header) => escapeCsvField(String(row[header.key] ?? ''))).join(',');
}

/**
 * Report job processor (PRD §20)
 */
export const reportJobProcessor: Processor<ReportJobData, ReportJobResult> = async (
  job: Job<ReportJobData, ReportJobResult>
) => {
  const { jobId, reportType, tenantId, tenantSchemaName, userId: _userId, talentId, profileStoreId, filters, options } = job.data;
  const startTime = Date.now();
  const format = job.data.format ?? 'xlsx';

  logger.info(`Processing report job ${jobId} type ${reportType} for tenant ${tenantId}`);
  logger.info(`Filters: ${JSON.stringify(filters)}`);

  const prisma = new PrismaClient();
  let tempFilePath: string | null = null;

  try {
    if (options?.includePii) {
      throw new Error(
        'PII-inclusive report generation has been retired from TMS. Use TCRN PII Platform report flow instead.',
      );
    }

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

    const language = options?.language || 'en';
    const headers = getHeaders(language);
    tempFilePath = path.join(os.tmpdir(), `mfr_${jobId}.${format}`);
    let workbook: ExcelJS.stream.xlsx.WorkbookWriter | null = null;
    let worksheet: ReturnType<ExcelJS.stream.xlsx.WorkbookWriter['addWorksheet']> | null = null;

    if (format === 'xlsx') {
      workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: tempFilePath,
        useStyles: true,
        useSharedStrings: true,
      });

      worksheet = workbook.addWorksheet('Membership Feedback Report', {
        properties: { defaultRowHeight: 20 },
      });

      worksheet.columns = headers.map((header) => ({
        header: header.label,
        key: header.key,
        width: header.width,
      }));

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    } else {
      const csvHeader = headers.map((header) => escapeCsvField(header.label)).join(',');
      fs.writeFileSync(tempFilePath, `${csvHeader}\n`, 'utf8');
    }

    // 5. Stream data in batches
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

      const csvLines: string[] = [];

      for (const record of records) {
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

        if (format === 'xlsx') {
          if (!worksheet) {
            throw new Error('XLSX worksheet not initialized');
          }
          worksheet.addRow(row).commit();
        } else {
          csvLines.push(buildCsvRow(headers, row));
        }
        processedCount++;
      }

      if (format === 'csv' && csvLines.length > 0) {
        fs.appendFileSync(tempFilePath, `${csvLines.join('\n')}\n`, 'utf8');
      }

      // Update progress (BullMQ and database)
      const progress = Math.round((processedCount / totalCount) * 100);
      await job.updateProgress(progress);
      await updateJobProgress(prisma, tenantSchemaName, jobId, processedCount, progress);
      logger.info(`Progress: ${progress}% (${processedCount}/${totalCount})`);
    }

    // 7. Finalize workbook
    if (format === 'xlsx') {
      await workbook?.commit();
    }

    // 8. Get file stats
    const stats = fs.statSync(tempFilePath);
    const fileName = `MFR_${tenantId}_${new Date().toISOString().replace(/[:-]/g, '').split('.')[0]}.${format}`;

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
      { 'Content-Type': getContentType(format) }
    );
    
    logger.info(`Successfully uploaded to MinIO: ${objectPath}`);

    // 10. Update job record with result
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'completed', {
      fileUrl: objectPath,
      fileName,
      fileSize: stats.size,
      rowCount: processedCount,
    });
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
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
function getHeaderLabel(
  language: string,
  labels: { en: string; zh: string; ja: string },
): string {
  switch (language) {
    case 'zh':
      return labels.zh;
    case 'ja':
      return labels.ja;
    default:
      return labels.en;
  }
}

/**
 * Get headers based on language
 */
function getHeaders(language: string): ReportHeader[] {
  return [
    { key: 'customerNickname', width: 20, label: getHeaderLabel(language, { en: 'Nickname', zh: '昵称', ja: 'ニックネーム' }) },
    { key: 'profileType', width: 12, label: getHeaderLabel(language, { en: 'Type', zh: '类型', ja: 'タイプ' }) },
    { key: 'platformName', width: 15, label: getHeaderLabel(language, { en: 'Platform', zh: '平台', ja: 'プラットフォーム' }) },
    { key: 'platformUid', width: 20, label: getHeaderLabel(language, { en: 'Platform UID', zh: '平台UID', ja: 'プラットフォームUID' }) },
    { key: 'membershipClass', width: 15, label: getHeaderLabel(language, { en: 'Class', zh: '类别', ja: 'クラス' }) },
    { key: 'membershipType', width: 15, label: getHeaderLabel(language, { en: 'Type', zh: '类型', ja: 'タイプ' }) },
    { key: 'membershipLevel', width: 15, label: getHeaderLabel(language, { en: 'Level', zh: '等级', ja: 'レベル' }) },
    { key: 'validFrom', width: 12, label: getHeaderLabel(language, { en: 'Valid From', zh: '生效日期', ja: '開始日' }) },
    { key: 'validTo', width: 12, label: getHeaderLabel(language, { en: 'Valid To', zh: '到期日期', ja: '終了日' }) },
    { key: 'autoRenew', width: 10, label: getHeaderLabel(language, { en: 'Auto Renew', zh: '自动续费', ja: '自動更新' }) },
    { key: 'isExpired', width: 10, label: getHeaderLabel(language, { en: 'Expired', zh: '已过期', ja: '期限切れ' }) },
    { key: 'customerStatus', width: 12, label: getHeaderLabel(language, { en: 'Status', zh: '状态', ja: 'ステータス' }) },
    { key: 'tags', width: 25, label: getHeaderLabel(language, { en: 'Tags', zh: '标签', ja: 'タグ' }) },
    { key: 'source', width: 15, label: getHeaderLabel(language, { en: 'Source', zh: '来源', ja: '取得元' }) },
    { key: 'createdAt', width: 12, label: getHeaderLabel(language, { en: 'Created', zh: '创建时间', ja: '作成日' }) },
  ];
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
    SET processed_rows = $1, progress_percentage = $2, updated_at = NOW()
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
      SET status = $1, started_at = $2, updated_at = NOW()
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
          expires_at = $7,
          updated_at = NOW()
      WHERE id = $8
    `, 'success', now, data?.fileUrl, data?.fileName, data?.fileSize, data?.rowCount, 
       expiresAt, jobId);
  } else if (status === 'failed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".report_job
      SET status = $1, 
          completed_at = $2, 
          error_message = $3,
          updated_at = NOW()
      WHERE id = $4
    `, 'failed', now, data?.errorMessage, jobId);
  }
}
