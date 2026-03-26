// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Export Job Processor

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as Minio from 'minio';
import * as os from 'os';
import * as path from 'path';

import { reportLogger as logger } from '../logger';

const TEMP_REPORTS_BUCKET = 'temp-reports';

const CUSTOMER_EXPORT_FIELD_DEFINITIONS = [
  { key: 'id', header: 'ID', width: 36 },
  { key: 'nickname', header: 'Nickname', width: 24 },
  { key: 'profileType', header: 'Profile Type', width: 16 },
  { key: 'statusCode', header: 'Status Code', width: 18 },
  { key: 'statusName', header: 'Status Name', width: 24 },
  { key: 'tags', header: 'Tags', width: 28 },
  { key: 'isActive', header: 'Active', width: 12 },
  { key: 'companyShortName', header: 'Company', width: 24 },
  { key: 'originTalentDisplayName', header: 'Origin Talent', width: 24 },
  { key: 'membershipPlatformCode', header: 'Membership Platform Code', width: 24 },
  { key: 'membershipPlatformName', header: 'Membership Platform', width: 24 },
  { key: 'membershipClassCode', header: 'Membership Class Code', width: 24 },
  { key: 'membershipClassName', header: 'Membership Class', width: 24 },
  { key: 'membershipLevelCode', header: 'Membership Level Code', width: 24 },
  { key: 'membershipLevelName', header: 'Membership Level', width: 24 },
  { key: 'membershipCount', header: 'Membership Count', width: 18 },
  { key: 'primaryLanguage', header: 'Primary Language', width: 18 },
  { key: 'source', header: 'Source', width: 18 },
  { key: 'createdAt', header: 'Created At', width: 24 },
  { key: 'updatedAt', header: 'Updated At', width: 24 },
] as const;

type CustomerExportField = (typeof CUSTOMER_EXPORT_FIELD_DEFINITIONS)[number]['key'];

interface CustomerExportFilters {
  customerIds?: string[];
  tags?: string[];
  membershipClassCode?: string;
  includePii?: boolean;
  fields?: string[];
}

export interface CustomerExportJobData {
  jobId: string;
  jobType?: string;
  talentId: string;
  profileStoreId?: string;
  tenantSchema: string;
  format: 'csv' | 'xlsx' | 'json';
  filters: CustomerExportFilters;
}

export interface CustomerExportJobResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  generatedAt: string;
}

interface CustomerExportRow {
  id: string;
  nickname: string;
  profileType: string;
  statusCode: string;
  statusName: string;
  tags: string;
  isActive: string;
  companyShortName: string;
  originTalentDisplayName: string;
  membershipPlatformCode: string;
  membershipPlatformName: string;
  membershipClassCode: string;
  membershipClassName: string;
  membershipLevelCode: string;
  membershipLevelName: string;
  membershipCount: number;
  primaryLanguage: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

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

function resolveRequestedFields(fields?: string[]): readonly CustomerExportField[] {
  if (!fields?.length) {
    return CUSTOMER_EXPORT_FIELD_DEFINITIONS.map((field) => field.key);
  }

  const allowedFields = new Set<CustomerExportField>(
    CUSTOMER_EXPORT_FIELD_DEFINITIONS.map((field) => field.key),
  );
  const invalidFields = fields.filter(
    (field): field is string => !allowedFields.has(field as CustomerExportField),
  );

  if (invalidFields.length > 0) {
    throw new Error(`Unsupported export fields: ${invalidFields.join(', ')}`);
  }

  return fields as CustomerExportField[];
}

function projectRow(
  row: CustomerExportRow,
  fields: readonly CustomerExportField[],
): Record<string, string | number> {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function escapeCsv(value: string | number): string {
  const normalized = String(value);
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function getContentType(format: CustomerExportJobData['format']): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'text/csv';
  }
}

function getFileExtension(format: CustomerExportJobData['format']): string {
  switch (format) {
    case 'json':
      return 'json';
    case 'xlsx':
      return 'xlsx';
    default:
      return 'csv';
  }
}

async function getProfileStoreId(
  prisma: PrismaClient,
  tenantSchema: string,
  talentId: string,
): Promise<string> {
  const talents = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string | null }>>(
    `SELECT profile_store_id as "profileStoreId"
     FROM "${tenantSchema}".talent
     WHERE id = $1::uuid`,
    talentId,
  );

  const profileStoreId = talents[0]?.profileStoreId;
  if (!profileStoreId) {
    throw new Error(`Talent ${talentId} has no profile store configured`);
  }

  return profileStoreId;
}

async function updateJobProgress(
  prisma: PrismaClient,
  tenantSchema: string,
  jobId: string,
  totalRecords: number,
  processedRecords: number,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "${tenantSchema}".export_job
     SET status = 'running',
         total_records = $1,
         processed_records = $2,
         started_at = COALESCE(started_at, NOW()),
         updated_at = NOW()
     WHERE id = $3::uuid`,
    totalRecords,
    processedRecords,
    jobId,
  );
}

async function updateJobCompleted(
  prisma: PrismaClient,
  tenantSchema: string,
  jobId: string,
  filePath: string,
  fileName: string,
  totalRecords: number,
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.$executeRawUnsafe(
    `UPDATE "${tenantSchema}".export_job
     SET status = 'success',
         file_path = $1,
         file_name = $2,
         total_records = $3,
         processed_records = $3,
         completed_at = NOW(),
         expires_at = $4::timestamptz,
         updated_at = NOW()
     WHERE id = $5::uuid`,
    filePath,
    fileName,
    totalRecords,
    expiresAt.toISOString(),
    jobId,
  );
}

async function updateJobFailed(
  prisma: PrismaClient,
  tenantSchema: string,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "${tenantSchema}".export_job
     SET status = 'failed',
         error_message = $1,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2::uuid`,
    errorMessage,
    jobId,
  );
}

async function fetchCustomerExportRows(
  prisma: PrismaClient,
  tenantSchema: string,
  profileStoreId: string,
  filters: CustomerExportFilters,
): Promise<CustomerExportRow[]> {
  const conditions: string[] = ['cp.profile_store_id = $1::uuid'];
  const params: unknown[] = [profileStoreId];
  let paramIndex = 2;

  if (filters.customerIds?.length) {
    conditions.push(`cp.id = ANY($${paramIndex}::uuid[])`);
    params.push(filters.customerIds);
    paramIndex++;
  }

  if (filters.tags?.length) {
    conditions.push(`cp.tags @> $${paramIndex}::text[]`);
    params.push(filters.tags);
    paramIndex++;
  }

  if (filters.membershipClassCode) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM "${tenantSchema}".membership_record mr_filter
        JOIN "${tenantSchema}".membership_class mc_filter
          ON mc_filter.id = mr_filter.membership_class_id
        WHERE mr_filter.customer_id = cp.id
          AND mc_filter.code = $${paramIndex}
      )
    `);
    params.push(filters.membershipClassCode);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  return prisma.$queryRawUnsafe<Array<{
    id: string;
    nickname: string;
    profileType: string;
    primaryLanguage: string | null;
    tags: string[] | null;
    isActive: boolean;
    source: string | null;
    createdAt: Date;
    updatedAt: Date;
    statusCode: string | null;
    statusName: string | null;
    companyShortName: string | null;
    originTalentDisplayName: string | null;
    membershipPlatformCode: string | null;
    membershipPlatformName: string | null;
    membershipClassCode: string | null;
    membershipClassName: string | null;
    membershipLevelCode: string | null;
    membershipLevelName: string | null;
    membershipCount: number;
  }>>(
    `SELECT
       cp.id,
       cp.nickname,
       cp.profile_type as "profileType",
       cp.primary_language as "primaryLanguage",
       cp.tags,
       cp.is_active as "isActive",
       cp.source,
       cp.created_at as "createdAt",
       cp.updated_at as "updatedAt",
       cs.code as "statusCode",
       cs.name_en as "statusName",
       cci.company_short_name as "companyShortName",
       ot.display_name as "originTalentDisplayName",
       hm.platform_code as "membershipPlatformCode",
       hm.platform_name as "membershipPlatformName",
       hm.class_code as "membershipClassCode",
       hm.class_name as "membershipClassName",
       hm.level_code as "membershipLevelCode",
       hm.level_name as "membershipLevelName",
       COALESCE(mc.membership_count, 0) as "membershipCount"
     FROM "${tenantSchema}".customer_profile cp
     LEFT JOIN "${tenantSchema}".customer_status cs ON cs.id = cp.status_id
     LEFT JOIN "${tenantSchema}".customer_company_info cci ON cci.customer_id = cp.id
     LEFT JOIN "${tenantSchema}".talent ot ON ot.id = cp.origin_talent_id
     LEFT JOIN LATERAL (
       SELECT
         p.code as platform_code,
         p.display_name as platform_name,
         mclass.code as class_code,
         mclass.name_en as class_name,
         ml.code as level_code,
         ml.name_en as level_name
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform p ON p.id = mr.platform_id
       JOIN "${tenantSchema}".membership_class mclass ON mclass.id = mr.membership_class_id
       JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
       WHERE mr.customer_id = cp.id
         AND mr.is_expired = false
         AND (mr.valid_to IS NULL OR mr.valid_to > NOW())
       ORDER BY ml.rank DESC NULLS LAST, mr.created_at DESC
       LIMIT 1
     ) hm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int as membership_count
       FROM "${tenantSchema}".membership_record mr_count
       WHERE mr_count.customer_id = cp.id
     ) mc ON true
     WHERE ${whereClause}
     ORDER BY cp.created_at DESC`,
    ...params,
  ).then((rows) =>
    rows.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      profileType: row.profileType,
      statusCode: row.statusCode ?? '',
      statusName: row.statusName ?? '',
      tags: (row.tags ?? []).join(', '),
      isActive: row.isActive ? 'true' : 'false',
      companyShortName: row.companyShortName ?? '',
      originTalentDisplayName: row.originTalentDisplayName ?? '',
      membershipPlatformCode: row.membershipPlatformCode ?? '',
      membershipPlatformName: row.membershipPlatformName ?? '',
      membershipClassCode: row.membershipClassCode ?? '',
      membershipClassName: row.membershipClassName ?? '',
      membershipLevelCode: row.membershipLevelCode ?? '',
      membershipLevelName: row.membershipLevelName ?? '',
      membershipCount: row.membershipCount,
      primaryLanguage: row.primaryLanguage ?? '',
      source: row.source ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
}

async function writeCustomerExportFile(
  jobId: string,
  format: CustomerExportJobData['format'],
  fields: readonly CustomerExportField[],
  rows: CustomerExportRow[],
): Promise<{ filePath: string; fileName: string }> {
  const dateStamp = new Date().toISOString().split('T')[0];
  const extension = getFileExtension(format);
  const fileName = `customer_export_${dateStamp}.${extension}`;
  const filePath = path.join(os.tmpdir(), `customer_export_${jobId}.${extension}`);
  const projectedRows = rows.map((row) => projectRow(row, fields));

  if (format === 'json') {
    fs.writeFileSync(filePath, JSON.stringify(projectedRows, null, 2), 'utf8');
    return { filePath, fileName };
  }

  if (format === 'csv') {
    const headerLine = fields.join(',');
    const bodyLines = projectedRows.map((row) =>
      fields.map((field) => escapeCsv(row[field] ?? '')).join(','),
    );
    fs.writeFileSync(filePath, [headerLine, ...bodyLines].join('\n'), 'utf8');
    return { filePath, fileName };
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Customers');
  worksheet.columns = fields.map((field) => {
    const definition = CUSTOMER_EXPORT_FIELD_DEFINITIONS.find(
      (candidate) => candidate.key === field,
    );

    return {
      header: definition?.header ?? field,
      key: field,
      width: definition?.width ?? 24,
    };
  });
  worksheet.getRow(1).font = { bold: true };

  for (const row of projectedRows) {
    worksheet.addRow(row);
  }

  await workbook.xlsx.writeFile(filePath);
  return { filePath, fileName };
}

async function uploadCustomerExportFile(
  tenantSchema: string,
  jobId: string,
  localFilePath: string,
  fileName: string,
  format: CustomerExportJobData['format'],
): Promise<{ objectPath: string; fileSize: number }> {
  const stats = fs.statSync(localFilePath);
  const minioClient = createMinioClient();
  const objectPath = `${tenantSchema}/${jobId}/${fileName}`;

  const bucketExists = await minioClient.bucketExists(TEMP_REPORTS_BUCKET);
  if (!bucketExists) {
    await minioClient.makeBucket(TEMP_REPORTS_BUCKET, 'us-east-1');
  }

  await minioClient.putObject(
    TEMP_REPORTS_BUCKET,
    objectPath,
    fs.createReadStream(localFilePath),
    stats.size,
    { 'Content-Type': getContentType(format) },
  );

  return {
    objectPath,
    fileSize: stats.size,
  };
}

export const customerExportJobProcessor: Processor<
  CustomerExportJobData,
  CustomerExportJobResult
> = async (job: Job<CustomerExportJobData, CustomerExportJobResult>) => {
  const { jobId, tenantSchema, talentId, format, filters } = job.data;
  const startTime = Date.now();
  const prisma = new PrismaClient();
  let localFilePath: string | null = null;

  logger.info(`Processing customer export job ${jobId} for talent ${talentId}`);
  logger.info(`Filters: ${JSON.stringify(filters)}`);

  try {
    if (filters.includePii) {
      throw new Error('Customer export does not support includePii yet');
    }

    const fields = resolveRequestedFields(filters.fields);
    const profileStoreId =
      job.data.profileStoreId ??
      (await getProfileStoreId(prisma, tenantSchema, talentId));
    const rows = await fetchCustomerExportRows(prisma, tenantSchema, profileStoreId, filters);

    await updateJobProgress(prisma, tenantSchema, jobId, rows.length, 0);

    const { filePath, fileName } = await writeCustomerExportFile(jobId, format, fields, rows);
    localFilePath = filePath;
    const { objectPath, fileSize } = await uploadCustomerExportFile(
      tenantSchema,
      jobId,
      filePath,
      fileName,
      format,
    );

    await job.updateProgress(100);
    await updateJobProgress(prisma, tenantSchema, jobId, rows.length, rows.length);
    await updateJobCompleted(prisma, tenantSchema, jobId, objectPath, fileName, rows.length);

    const duration = Date.now() - startTime;
    logger.info(`Customer export job ${jobId} completed in ${duration}ms`);

    return {
      filePath: objectPath,
      fileName,
      fileSize,
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Customer export job ${jobId} failed: ${errorMessage}`);
    await updateJobFailed(prisma, tenantSchema, jobId, errorMessage);
    throw error;
  } finally {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    await prisma.$disconnect();
  }
};
