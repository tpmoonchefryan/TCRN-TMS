// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Job Processor (PRD §20)

import { PrismaClient } from '@tcrn/database';
import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
  type TrilingualLocaleFamily,
} from '@tcrn/shared';
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
type ReportLanguage = SupportedUiLocale | TrilingualLocaleFamily;

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
    statusCodes?: string[];
    validFromStart?: string;
    validFromEnd?: string;
    validToStart?: string;
    validToEnd?: string;
    includeExpired?: boolean;
    includeInactive?: boolean;
  };
  options?: {
    includePii?: boolean; // Requires additional permission check
    language?: ReportLanguage;
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

interface RawMfrRecord {
  customer_nickname: string;
  profile_type: string;
  platform_name_en: string;
  platform_name_zh: string | null;
  platform_name_ja: string | null;
  membership_class_name_en: string;
  membership_class_name_zh: string | null;
  membership_class_name_ja: string | null;
  membership_type_name_en: string;
  membership_type_name_zh: string | null;
  membership_type_name_ja: string | null;
  membership_level_name_en: string;
  membership_level_name_zh: string | null;
  membership_level_name_ja: string | null;
  valid_from: Date;
  valid_to: Date | null;
  auto_renew: boolean;
  is_expired: boolean;
  customer_status_name_en: string | null;
  customer_status_name_zh: string | null;
  customer_status_name_ja: string | null;
  tags: string[] | null;
  source: string | null;
  created_at: Date;
}

interface LocalizedEntityRecord {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
}

interface MembershipWhereQuery {
  whereClause: string;
  params: unknown[];
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

function toLocalizedEntity(
  nameEn: string,
  nameZh: string | null,
  nameJa: string | null,
): LocalizedEntityRecord {
  return { nameEn, nameZh, nameJa };
}

function buildMembershipWhereQuery(
  talentId: string,
  filters: ReportJobData['filters'],
): MembershipWhereQuery {
  const conditions: string[] = ['cp.talent_id = $1::uuid'];
  const params: unknown[] = [talentId];
  let paramIndex = 2;

  if (filters.platformCodes?.length) {
    conditions.push(`sp.code = ANY($${paramIndex}::text[])`);
    params.push(filters.platformCodes);
    paramIndex += 1;
  }

  if (filters.membershipClassCodes?.length) {
    conditions.push(`mc.code = ANY($${paramIndex}::text[])`);
    params.push(filters.membershipClassCodes);
    paramIndex += 1;
  }

  if (filters.membershipTypeCodes?.length) {
    conditions.push(`mt.code = ANY($${paramIndex}::text[])`);
    params.push(filters.membershipTypeCodes);
    paramIndex += 1;
  }

  if (filters.membershipLevelCodes?.length) {
    conditions.push(`ml.code = ANY($${paramIndex}::text[])`);
    params.push(filters.membershipLevelCodes);
    paramIndex += 1;
  }

  if (filters.statusCodes?.length) {
    conditions.push(`cs.code = ANY($${paramIndex}::text[])`);
    params.push(filters.statusCodes);
    paramIndex += 1;
  }

  if (filters.validFromStart) {
    conditions.push(`mr.valid_from >= $${paramIndex}::timestamptz`);
    params.push(new Date(filters.validFromStart));
    paramIndex += 1;
  }

  if (filters.validFromEnd) {
    conditions.push(`mr.valid_from <= $${paramIndex}::timestamptz`);
    params.push(new Date(filters.validFromEnd));
    paramIndex += 1;
  }

  if (filters.validToStart) {
    conditions.push(`mr.valid_to >= $${paramIndex}::timestamptz`);
    params.push(new Date(filters.validToStart));
    paramIndex += 1;
  }

  if (filters.validToEnd) {
    conditions.push(`mr.valid_to <= $${paramIndex}::timestamptz`);
    params.push(new Date(filters.validToEnd));
    paramIndex += 1;
  }

  if (!filters.includeExpired) {
    conditions.push('(mr.valid_to IS NULL OR mr.valid_to >= NOW())');
  }

  if (!filters.includeInactive) {
    conditions.push('cp.is_active = true');
  }

  return {
    whereClause: conditions.join(' AND '),
    params,
  };
}

async function countMembershipRows(
  prisma: PrismaClient,
  tenantSchemaName: string,
  talentId: string,
  filters: ReportJobData['filters'],
): Promise<number> {
  const { whereClause, params } = buildMembershipWhereQuery(talentId, filters);
  const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT COUNT(*) AS count
    FROM "${tenantSchemaName}".membership_record mr
    JOIN "${tenantSchemaName}".customer_profile cp ON cp.id = mr.customer_id
    JOIN "${tenantSchemaName}".social_platform sp ON sp.id = mr.platform_id
    JOIN "${tenantSchemaName}".membership_class mc ON mc.id = mr.membership_class_id
    JOIN "${tenantSchemaName}".membership_type mt ON mt.id = mr.membership_type_id
    JOIN "${tenantSchemaName}".membership_level ml ON ml.id = mr.membership_level_id
    LEFT JOIN "${tenantSchemaName}".customer_status cs ON cs.id = cp.status_id
    WHERE ${whereClause}
  `, ...params);

  return Number(countResult[0]?.count ?? 0n);
}

async function fetchMembershipRows(
  prisma: PrismaClient,
  tenantSchemaName: string,
  talentId: string,
  filters: ReportJobData['filters'],
  take: number,
  skip: number,
): Promise<RawMfrRecord[]> {
  const { whereClause, params } = buildMembershipWhereQuery(talentId, filters);

  return prisma.$queryRawUnsafe<RawMfrRecord[]>(`
    SELECT
      cp.nickname AS customer_nickname,
      cp.profile_type,
      sp.name_en AS platform_name_en,
      sp.name_zh AS platform_name_zh,
      sp.name_ja AS platform_name_ja,
      mc.name_en AS membership_class_name_en,
      mc.name_zh AS membership_class_name_zh,
      mc.name_ja AS membership_class_name_ja,
      mt.name_en AS membership_type_name_en,
      mt.name_zh AS membership_type_name_zh,
      mt.name_ja AS membership_type_name_ja,
      ml.name_en AS membership_level_name_en,
      ml.name_zh AS membership_level_name_zh,
      ml.name_ja AS membership_level_name_ja,
      mr.valid_from,
      mr.valid_to,
      mr.auto_renew,
      mr.is_expired,
      cs.name_en AS customer_status_name_en,
      cs.name_zh AS customer_status_name_zh,
      cs.name_ja AS customer_status_name_ja,
      cp.tags,
      cp.source,
      mr.created_at
    FROM "${tenantSchemaName}".membership_record mr
    JOIN "${tenantSchemaName}".customer_profile cp ON cp.id = mr.customer_id
    JOIN "${tenantSchemaName}".social_platform sp ON sp.id = mr.platform_id
    JOIN "${tenantSchemaName}".membership_class mc ON mc.id = mr.membership_class_id
    JOIN "${tenantSchemaName}".membership_type mt ON mt.id = mr.membership_type_id
    JOIN "${tenantSchemaName}".membership_level ml ON ml.id = mr.membership_level_id
    LEFT JOIN "${tenantSchemaName}".customer_status cs ON cs.id = cp.status_id
    WHERE ${whereClause}
    ORDER BY mr.created_at DESC
    LIMIT ${take}
    OFFSET ${skip}
  `, ...params);
}

/**
 * Report job processor (PRD §20)
 */
export const reportJobProcessor: Processor<ReportJobData, ReportJobResult> = async (
  job: Job<ReportJobData, ReportJobResult>
) => {
  const {
    jobId,
    reportType,
    tenantId,
    tenantSchemaName,
    userId: _userId,
    talentId,
    profileStoreId: _profileStoreId,
    filters,
    options,
  } = job.data;
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

    if (!talentId) {
      throw new Error('Report job is missing talentId');
    }

    // 3. Count total records for progress tracking
    const totalCount = await countMembershipRows(
      prisma,
      tenantSchemaName,
      talentId,
      filters,
    );

    logger.info(`Total records to process: ${totalCount}`);

    const language = resolveTrilingualLocaleFamily(options?.language);
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
      const records = await fetchMembershipRows(
        prisma,
        tenantSchemaName,
        talentId,
        filters,
        batchSize,
        skip,
      );

      const csvLines: string[] = [];

      for (const record of records) {
        const row: MfrRow = {
          customerNickname: record.customer_nickname,
          profileType: record.profile_type,
          platformName: getLocalizedName(
            toLocalizedEntity(
              record.platform_name_en,
              record.platform_name_zh,
              record.platform_name_ja,
            ),
            language,
          ),
          platformUid: '', // Would need to fetch from platform_identity
          membershipClass: getLocalizedName(
            toLocalizedEntity(
              record.membership_class_name_en,
              record.membership_class_name_zh,
              record.membership_class_name_ja,
            ),
            language,
          ),
          membershipType: getLocalizedName(
            toLocalizedEntity(
              record.membership_type_name_en,
              record.membership_type_name_zh,
              record.membership_type_name_ja,
            ),
            language,
          ),
          membershipLevel: getLocalizedName(
            toLocalizedEntity(
              record.membership_level_name_en,
              record.membership_level_name_zh,
              record.membership_level_name_ja,
            ),
            language,
          ),
          validFrom: record.valid_from.toISOString().split('T')[0],
          validTo: record.valid_to?.toISOString().split('T')[0] || '',
          autoRenew: record.auto_renew,
          isExpired: record.is_expired,
          customerStatus: record.customer_status_name_en
            ? getLocalizedName(
                toLocalizedEntity(
                  record.customer_status_name_en,
                  record.customer_status_name_zh,
                  record.customer_status_name_ja,
                ),
                language,
              )
            : '',
          tags: (record.tags ?? []).join(', '),
          source: record.source || '',
          createdAt: record.created_at.toISOString().split('T')[0],
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
    WHERE id = $3::uuid
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
      WHERE id = $3::uuid
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
      WHERE id = $8::uuid
    `, 'success', now, data?.fileUrl, data?.fileName, data?.fileSize, data?.rowCount, 
       expiresAt, jobId);
  } else if (status === 'failed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".report_job
      SET status = $1, 
          completed_at = $2, 
          error_message = $3,
          updated_at = NOW()
      WHERE id = $4::uuid
    `, 'failed', now, data?.errorMessage, jobId);
  }
}
