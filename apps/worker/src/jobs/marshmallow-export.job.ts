// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow Export Job Processor

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { reportLogger as logger } from '../logger';

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

/**
 * Marshmallow export job processor
 */
export const marshmallowExportJobProcessor: Processor<
  MarshmallowExportJobData,
  MarshmallowExportJobResult
> = async (job: Job<MarshmallowExportJobData, MarshmallowExportJobResult>) => {
  const { jobId, talentId, tenantSchema, format, filters } = job.data;
  const startTime = Date.now();

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

    // 6. Get file stats
    const stats = fs.statSync(filePath);

    // 7. Upload to MinIO (TODO: implement actual upload)
    const minioPath = `temp-reports/${tenantSchema}/${fileName}`;
    logger.info(`File generated: ${filePath} (${stats.size} bytes)`);
    logger.info(`MinIO path: ${minioPath}`);

    // TODO: Implement actual MinIO upload
    // const minioClient = new MinioService();
    // await minioClient.uploadFile('temp-reports', minioPath, filePath);

    // 8. Update job record with result
    await updateJobCompleted(prisma, tenantSchema, jobId, minioPath, fileName, totalCount);

    // 9. Cleanup temp file
    // Note: Keep temp file for now until MinIO upload is implemented
    // fs.unlinkSync(filePath);

    const duration = Date.now() - startTime;
    logger.info(`Marshmallow export job ${jobId} completed in ${duration}ms`);

    return {
      filePath: minioPath,
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
  await prisma.$executeRawUnsafe(
    `UPDATE "${schemaName}".export_job
    SET status = $1, started_at = NOW()
    WHERE id = $2::uuid`,
    status,
    jobId,
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

  await prisma.$executeRawUnsafe(
    `UPDATE "${schemaName}".export_job
    SET 
      status = 'success',
      file_path = $1,
      file_name = $2,
      total_records = $3,
      processed_records = $3,
      completed_at = NOW(),
      expires_at = $4::timestamptz
    WHERE id = $5::uuid`,
    filePath,
    fileName,
    totalRecords,
    expiresAt.toISOString(),
    jobId,
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
  await prisma.$executeRawUnsafe(
    `UPDATE "${schemaName}".export_job
    SET 
      status = 'failed',
      error_message = $1,
      completed_at = NOW()
    WHERE id = $2::uuid`,
    errorMessage,
    jobId,
  );
}
