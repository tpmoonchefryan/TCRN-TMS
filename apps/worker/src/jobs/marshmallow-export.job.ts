// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow Export Job Processor

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as Minio from 'minio';
import * as os from 'os';
import * as path from 'path';

import { reportLogger as logger } from '../logger';

const TEMP_REPORTS_BUCKET = 'temp-reports';
const CURRENT_MARSHMALLOW_EXPORT_TABLE = 'marshmallow_export_job';
const LEGACY_MARSHMALLOW_EXPORT_TABLE = 'export_job';
const LEGACY_MARSHMALLOW_EXPORT_JOB_TYPE = 'marshmallow_export';

/**
 * Export format options
 */
export type ExportFormat = 'xlsx' | 'csv' | 'json';

/**
 * Marshmallow export job data interface
 */
export interface MarshmallowExportJobData {
  jobId: string;
  talentId: string;
  tenantSchema: string;
  format: ExportFormat;
  filters: {
    status?: string[];
    startDate?: string;
    endDate?: string;
    includeRejected?: boolean;
  };
}

/**
 * Export job result
 */
export interface MarshmallowExportJobResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  generatedAt: string;
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

function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'text/csv';
  }
}

/**
 * Marshmallow export job processor
 */
export const marshmallowExportJobProcessor: Processor<
  MarshmallowExportJobData,
  MarshmallowExportJobResult
> = async (job: Job<MarshmallowExportJobData, MarshmallowExportJobResult>) => {
  const { jobId, talentId, tenantSchema, format, filters } = job.data;
  const startTime = Date.now();
  let localFilePath: string | null = null;

  logger.info(`Processing marshmallow export job ${jobId} for talent ${talentId}`);
  logger.info(`Filters: ${JSON.stringify(filters)}`);

  const prisma = new PrismaClient();

  try {
    // 1. Update job status to processing
    await updateJobStatus(prisma, tenantSchema, jobId, 'running');

    // 2. Build query conditions
    const conditions: string[] = ['m.talent_id = $1::uuid'];
    const params: (string | boolean)[] = [talentId];
    let paramIndex = 2;

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`m.status IN (${statusPlaceholders})`);
      params.push(...filters.status);
    } else if (!filters.includeRejected) {
      // By default exclude rejected if not explicitly including
      conditions.push(`m.status != 'rejected'`);
    }

    // Date range
    if (filters.startDate) {
      conditions.push(`m.created_at >= $${paramIndex++}::timestamptz`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`m.created_at <= $${paramIndex++}::timestamptz`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.join(' AND ');

    // 3. Count total records
    const countResult = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM "${tenantSchema}".marshmallow_message m WHERE ${whereClause}`,
      ...params,
    );
    const totalCount = countResult[0]?.count ?? 0;

    logger.info(`Total records to export: ${totalCount}`);

    // 4. Fetch all messages
    const messages = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        senderName: string | null;
        isAnonymous: boolean;
        status: string;
        replyContent: string | null;
        createdAt: Date;
        moderatedAt: Date | null;
        reactionCounts: Record<string, number> | null;
      }>
    >(
      `SELECT 
        m.id,
        m.content,
        m.sender_name as "senderName",
        m.is_anonymous as "isAnonymous",
        m.status,
        m.reply_content as "replyContent",
        m.created_at as "createdAt",
        m.moderated_at as "moderatedAt",
        m.reaction_counts as "reactionCounts"
      FROM "${tenantSchema}".marshmallow_message m
      WHERE ${whereClause}
      ORDER BY m.created_at DESC`,
      ...params,
    );

    // 5. Create output file based on format
    let filePath: string;
    let fileName: string;

    if (format === 'json') {
      // JSON export
      filePath = path.join(os.tmpdir(), `marshmallow_${jobId}.json`);
      fileName = `marshmallow_export_${new Date().toISOString().split('T')[0]}.json`;

      const jsonData = messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderName: msg.isAnonymous ? null : msg.senderName,
        isAnonymous: msg.isAnonymous,
        status: msg.status,
        replyContent: msg.replyContent,
        createdAt: msg.createdAt.toISOString(),
        moderatedAt: msg.moderatedAt?.toISOString() ?? null,
        reactionCounts: msg.reactionCounts ?? {},
      }));

      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    } else if (format === 'csv') {
      // CSV export
      filePath = path.join(os.tmpdir(), `marshmallow_${jobId}.csv`);
      fileName = `marshmallow_export_${new Date().toISOString().split('T')[0]}.csv`;

      const csvHeaders = 'ID,Content,Sender Name,Anonymous,Status,Reply,Created At,Moderated At,Reactions\n';
      const csvRows = messages.map((msg) => {
        const escapedContent = `"${msg.content.replace(/"/g, '""')}"`;
        const escapedReply = msg.replyContent ? `"${msg.replyContent.replace(/"/g, '""')}"` : '';
        const reactions = msg.reactionCounts ? JSON.stringify(msg.reactionCounts) : '';
        return [
          msg.id,
          escapedContent,
          msg.isAnonymous ? '' : (msg.senderName || ''),
          msg.isAnonymous ? 'Yes' : 'No',
          msg.status,
          escapedReply,
          msg.createdAt.toISOString(),
          msg.moderatedAt?.toISOString() ?? '',
          `"${reactions}"`,
        ].join(',');
      }).join('\n');

      fs.writeFileSync(filePath, csvHeaders + csvRows, 'utf8');
    } else {
      // XLSX export (default)
      filePath = path.join(os.tmpdir(), `marshmallow_${jobId}.xlsx`);
      fileName = `marshmallow_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Marshmallow Messages');

      // Setup columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Content', key: 'content', width: 50 },
        { header: 'Sender Name', key: 'senderName', width: 20 },
        { header: 'Anonymous', key: 'isAnonymous', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Reply', key: 'replyContent', width: 40 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Moderated At', key: 'moderatedAt', width: 20 },
        { header: 'Reactions', key: 'reactionCounts', width: 30 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data rows
      for (const msg of messages) {
        worksheet.addRow({
          id: msg.id,
          content: msg.content,
          senderName: msg.isAnonymous ? '' : msg.senderName,
          isAnonymous: msg.isAnonymous ? 'Yes' : 'No',
          status: msg.status,
          replyContent: msg.replyContent ?? '',
          createdAt: msg.createdAt.toISOString(),
          moderatedAt: msg.moderatedAt?.toISOString() ?? '',
          reactionCounts: msg.reactionCounts ? JSON.stringify(msg.reactionCounts) : '',
        });
      }

      await workbook.xlsx.writeFile(filePath);
    }

    localFilePath = filePath;

    // 6. Get file stats
    const stats = fs.statSync(filePath);

    // 7. Upload to MinIO
    const objectPath = `${tenantSchema}/${jobId}/${fileName}`;
    const minioClient = createMinioClient();
    logger.info(`File generated: ${filePath} (${stats.size} bytes)`);
    logger.info(`MinIO path: ${objectPath}`);

    const bucketExists = await minioClient.bucketExists(TEMP_REPORTS_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(TEMP_REPORTS_BUCKET, 'us-east-1');
    }

    await minioClient.putObject(
      TEMP_REPORTS_BUCKET,
      objectPath,
      fs.createReadStream(filePath),
      stats.size,
      { 'Content-Type': getContentType(format) },
    );

    // 8. Update job record with result
    await updateJobCompleted(prisma, tenantSchema, jobId, objectPath, fileName, totalCount);

    const duration = Date.now() - startTime;
    logger.info(`Marshmallow export job ${jobId} completed in ${duration}ms`);

    return {
      filePath: objectPath,
      fileName,
      fileSize: stats.size,
      rowCount: totalCount,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Marshmallow export job ${jobId} failed: ${errorMessage}`);

    // Update job status to failed
    await updateJobFailed(prisma, tenantSchema, jobId, errorMessage);

    throw error;
  } finally {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    await prisma.$disconnect();
  }
};

/**
 * Update job status to running
 */
async function updateJobStatus(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  status: string,
): Promise<void> {
  await executeMarshmallowJobUpdate(
    prisma,
    `UPDATE "${schemaName}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
     SET status = $1, started_at = NOW(), updated_at = NOW()
     WHERE id = $2::uuid`,
    [status, jobId],
    `UPDATE "${schemaName}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
     SET status = $1, started_at = NOW(), updated_at = NOW()
     WHERE id = $2::uuid
       AND job_type = $3`,
    [status, jobId, LEGACY_MARSHMALLOW_EXPORT_JOB_TYPE],
  );
}

/**
 * Update job as completed
 */
async function updateJobCompleted(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  filePath: string,
  fileName: string,
  totalRecords: number,
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await executeMarshmallowJobUpdate(
    prisma,
    `UPDATE "${schemaName}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
     SET
       status = 'success',
       file_path = $1,
       file_name = $2,
       total_records = $3,
       processed_records = $3,
       completed_at = NOW(),
       expires_at = $4::timestamptz,
       updated_at = NOW()
     WHERE id = $5::uuid`,
    [filePath, fileName, totalRecords, expiresAt.toISOString(), jobId],
    `UPDATE "${schemaName}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
     SET
       status = 'success',
       file_path = $1,
       file_name = $2,
       total_records = $3,
       processed_records = $3,
       completed_at = NOW(),
       expires_at = $4::timestamptz,
       updated_at = NOW()
     WHERE id = $5::uuid
       AND job_type = $6`,
    [filePath, fileName, totalRecords, expiresAt.toISOString(), jobId, LEGACY_MARSHMALLOW_EXPORT_JOB_TYPE],
  );
}

/**
 * Update job as failed
 */
async function updateJobFailed(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await executeMarshmallowJobUpdate(
    prisma,
    `UPDATE "${schemaName}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
     SET
       status = 'failed',
       error_message = $1,
       completed_at = NOW(),
       updated_at = NOW()
     WHERE id = $2::uuid`,
    [errorMessage, jobId],
    `UPDATE "${schemaName}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
     SET
       status = 'failed',
       error_message = $1,
       completed_at = NOW(),
       updated_at = NOW()
     WHERE id = $2::uuid
       AND job_type = $3`,
    [errorMessage, jobId, LEGACY_MARSHMALLOW_EXPORT_JOB_TYPE],
  );
}

async function executeMarshmallowJobUpdate(
  prisma: PrismaClient,
  currentSql: string,
  currentParams: unknown[],
  legacySql: string,
  legacyParams: unknown[],
): Promise<void> {
  const currentUpdated = await prisma.$executeRawUnsafe(currentSql, ...currentParams);
  if (currentUpdated > 0) {
    return;
  }

  await prisma.$executeRawUnsafe(legacySql, ...legacyParams);
}
