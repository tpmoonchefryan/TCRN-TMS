// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import Job Processor (PRD §11.7)

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import { parse } from 'csv-parse';
import { v4 as uuidv4 } from 'uuid';

import { importLogger as logger } from '../logger';

/**
 * Import job data interface (PRD §11.7)
 */
export interface ImportJobData {
  jobId: string;
  tenantId: string;
  tenantSchemaName: string;
  talentId: string;
  profileStoreId: string;
  userId: string;
  filePath: string; // MinIO path: imports/{uuid}.csv
  jobType: 'customer_create' | 'customer_update' | 'membership_sync';
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    validateOnly?: boolean;
  };
}

/**
 * Import job result
 */
export interface ImportJobResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  warnings: Array<{ row: number; field?: string; message: string }>;
}

/**
 * CSV row interface for customer import
 */
interface CustomerCsvRow {
  nickname: string;
  profile_type?: string;
  platform_code?: string;
  platform_uid?: string;
  membership_class_code?: string;
  membership_type_code?: string;
  membership_level_code?: string;
  valid_from?: string;
  valid_to?: string;
  tags?: string;
  source?: string;
  notes?: string;
  // PII fields (optional, sent to PII service)
  real_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Lookup data for validation and processing
 */
interface LookupData {
  platforms: Map<string, string>;
  membershipClasses: Map<string, string>;
  membershipTypes: Map<string, string>;
  membershipLevels: Map<string, string>;
  customerStatuses: Map<string, string>;
}

/**
 * Import job processor (PRD §11.7)
 */
export const importJobProcessor: Processor<ImportJobData, ImportJobResult> = async (
  job: Job<ImportJobData, ImportJobResult>
) => {
  const { jobId, tenantId, tenantSchemaName, talentId, profileStoreId, userId, filePath, jobType, options } = job.data;
  const startTime = Date.now();

  logger.info(`Processing import job ${jobId} for tenant ${tenantId}, talent ${talentId}`);
  logger.info(`File: ${filePath}, Type: ${jobType}`);

  const prisma = new PrismaClient();
  const result: ImportJobResult = {
    totalRows: 0,
    successRows: 0,
    failedRows: 0,
    skippedRows: 0,
    errors: [],
    warnings: [],
  };

  try {
    // 1. Update job status to processing
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'processing');

    // 2. Download file from MinIO (placeholder)
    const tempFilePath = path.join(os.tmpdir(), `import_${jobId}.csv`);
    logger.info(`Downloading to: ${tempFilePath}`);
    
    // TODO: Implement actual MinIO download
    // const minioClient = new MinioService();
    // await minioClient.downloadFile('imports', filePath, tempFilePath);

    // For development: assume file exists locally
    if (!fs.existsSync(tempFilePath)) {
      // Create sample file for testing
      fs.writeFileSync(tempFilePath, 'nickname,profile_type,platform_code,platform_uid\nTest User,individual,BILIBILI,12345\n');
    }

    // 3. Load lookup data (platforms, membership configs, statuses)
    const lookupData = await loadLookupData(prisma, tenantSchemaName);

    // 4. Stream CSV and process rows
    const parser = fs
      .createReadStream(tempFilePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          cast: true,
        })
      );

    let rowNumber = 1; // Start after header

    for await (const row of parser) {
      rowNumber++;
      result.totalRows++;

      try {
        // Validate row
        const validation = validateRow(row as CustomerCsvRow, lookupData, rowNumber);
        
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(w => {
            result.warnings.push({ row: rowNumber, message: w });
          });
        }

        if (!validation.valid) {
          result.failedRows++;
          validation.errors.forEach(e => {
            result.errors.push({ row: rowNumber, message: e });
          });
          continue;
        }

        // Skip if validate only
        if (options?.validateOnly) {
          result.successRows++;
          continue;
        }

        // Process row based on job type
        switch (jobType) {
          case 'customer_create':
            await processCustomerCreate(prisma, tenantSchemaName, row as CustomerCsvRow, {
              talentId,
              profileStoreId,
              userId,
              lookupData,
              skipDuplicates: options?.skipDuplicates,
            });
            result.successRows++;
            break;

            case 'customer_update': {
              const updated = await processCustomerUpdate(prisma, tenantSchemaName, row as CustomerCsvRow, {
                talentId,
                profileStoreId,
                userId,
                lookupData,
              });
              if (updated) {
                result.successRows++;
              } else {
                result.skippedRows++;
                result.warnings.push({ row: rowNumber, message: 'Customer not found for update' });
              }
              break;
            }
          case 'membership_sync':
            await processMembershipSync(prisma, tenantSchemaName, row as CustomerCsvRow, {
              talentId,
              profileStoreId,
              lookupData,
            });
            result.successRows++;
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.failedRows++;
        result.errors.push({
          row: rowNumber,
          message: errorMessage,
        });
      }

      // Update progress every 100 rows
      if (rowNumber % 100 === 0) {
        const progress = Math.round((rowNumber / (result.totalRows || rowNumber)) * 100);
        await job.updateProgress(Math.min(progress, 99));
        logger.info(`Progress: Row ${rowNumber}, Success: ${result.successRows}, Failed: ${result.failedRows}`);
      }
    }

    // 5. Cleanup temp file
    fs.unlinkSync(tempFilePath);

    // 6. Update job status
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'completed', result);

    const duration = Date.now() - startTime;
    logger.info(`Import job ${jobId} completed in ${duration}ms`);
    logger.info(`Total: ${result.totalRows}, Success: ${result.successRows}, Failed: ${result.failedRows}, Skipped: ${result.skippedRows}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Import job ${jobId} failed: ${errorMessage}`);

    // Update job status to failed
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'failed', result, errorMessage);

    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Load lookup data for validation
 */
async function loadLookupData(prisma: PrismaClient, _schemaName: string) {
  // Load platforms
  const platforms = await prisma.socialPlatform.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });

  // Load membership classes, types, levels
  const membershipClasses = await prisma.membershipClass.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });

  const membershipTypes = await prisma.membershipType.findMany({
    where: { isActive: true },
    select: { id: true, code: true, membershipClassId: true },
  });

  const membershipLevels = await prisma.membershipLevel.findMany({
    where: { isActive: true },
    select: { id: true, code: true, membershipTypeId: true },
  });

  // Load customer statuses
  const customerStatuses = await prisma.customerStatus.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });

  return {
    platforms: new Map(platforms.map(p => [p.code, p.id])),
    membershipClasses: new Map(membershipClasses.map(m => [m.code, m.id])),
    membershipTypes: new Map(membershipTypes.map(m => [`${m.membershipClassId}:${m.code}`, m.id])),
    membershipLevels: new Map(membershipLevels.map(m => [`${m.membershipTypeId}:${m.code}`, m.id])),
    customerStatuses: new Map(customerStatuses.map(s => [s.code, s.id])),
  };
}

/**
 * Validate a CSV row
 */
function validateRow(row: CustomerCsvRow, lookupData: LookupData, _rowNumber: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!row.nickname?.trim()) {
    errors.push('Nickname is required');
  }

  // Profile type validation
  if (row.profile_type && !['individual', 'company'].includes(row.profile_type)) {
    errors.push(`Invalid profile_type: ${row.profile_type}. Must be 'individual' or 'company'`);
  }

  // Platform validation
  if (row.platform_code && !lookupData.platforms.has(row.platform_code)) {
    errors.push(`Invalid platform_code: ${row.platform_code}`);
  }

  // Membership validation
  if (row.membership_class_code && !lookupData.membershipClasses.has(row.membership_class_code)) {
    errors.push(`Invalid membership_class_code: ${row.membership_class_code}`);
  }

  // Date validation
  if (row.valid_from && isNaN(Date.parse(row.valid_from))) {
    errors.push(`Invalid valid_from date: ${row.valid_from}`);
  }

  if (row.valid_to && isNaN(Date.parse(row.valid_to))) {
    errors.push(`Invalid valid_to date: ${row.valid_to}`);
  }

  // Email format validation
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    warnings.push(`Invalid email format: ${row.email}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate masked name for search
 * Format: "姓 + * + 名最后一字", e.g., "张*三"
 */
function generateSearchHintName(realName?: string): string | null {
  if (!realName) return null;
  const name = realName.trim();
  if (name.length === 0) return null;
  if (name.length === 1) return `${name}*`;
  if (name.length === 2) return `${name.charAt(0)}*${name.charAt(1)}`;
  return `${name.charAt(0)}*${name.charAt(name.length - 1)}`;
}

/**
 * Generate phone last 4 digits for search
 */
function generateSearchHintPhoneLast4(phone?: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 4 ? cleaned.slice(-4) : null;
}

/**
 * Process customer create
 */
async function processCustomerCreate(
  prisma: PrismaClient,
  _schemaName: string,
  row: CustomerCsvRow,
  options: {
    talentId: string;
    profileStoreId: string;
    userId: string;
    lookupData: LookupData;
    skipDuplicates?: boolean;
  }
) {
  const customerId = uuidv4();
  const rmProfileId = uuidv4(); // PII token
  const profileType = row.profile_type || 'individual';

  // Generate search hints for individual profiles
  const searchHintName = profileType === 'individual' ? generateSearchHintName(row.real_name) : null;
  const searchHintPhoneLast4 = profileType === 'individual' ? generateSearchHintPhoneLast4(row.phone) : null;

  // Create customer profile
  await prisma.customerProfile.create({
    data: {
      id: customerId,
      talentId: options.talentId,
      profileStoreId: options.profileStoreId,
      originTalentId: options.talentId,
      rmProfileId,
      profileType,
      nickname: row.nickname,
      tags: row.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
      source: row.source || 'import',
      notes: row.notes,
      createdBy: options.userId,
      updatedBy: options.userId,
    },
  });

  // Note: In actual implementation, searchHintName and searchHintPhoneLast4 would be 
  // stored directly on CustomerProfile or in a separate indexed view.
  // The CustomerIndividual table is not present in the current schema.
  if (profileType === 'individual' && (searchHintName || searchHintPhoneLast4)) {
    logger.info(`Search hints for ${customerId}: name=${searchHintName}, phone=${searchHintPhoneLast4}`);
  }

  // Create platform identity if provided
  if (row.platform_code && row.platform_uid) {
    const platformId = options.lookupData.platforms.get(row.platform_code);
    if (platformId) {
      await prisma.platformIdentity.create({
        data: {
          customerId,
          platformId,
          platformUid: row.platform_uid,
          isCurrent: true,
          isVerified: false,
        },
      });
    }
  }

  // Create membership record if provided
  if (row.membership_class_code && row.membership_type_code && row.membership_level_code) {
    const classId = options.lookupData.membershipClasses.get(row.membership_class_code);
    const typeId = options.lookupData.membershipTypes.get(`${classId}:${row.membership_type_code}`);
    const levelId = options.lookupData.membershipLevels.get(`${typeId}:${row.membership_level_code}`);
    const platformId = row.platform_code ? options.lookupData.platforms.get(row.platform_code) : null;

    if (classId && typeId && levelId && platformId) {
      await prisma.membershipRecord.create({
        data: {
          customerId,
          platformId,
          membershipClassId: classId,
          membershipTypeId: typeId,
          membershipLevelId: levelId,
          validFrom: row.valid_from ? new Date(row.valid_from) : new Date(),
          validTo: row.valid_to ? new Date(row.valid_to) : null,
          autoRenew: false,
          createdBy: options.userId,
          updatedBy: options.userId,
        },
      });
    }
  }

  // TODO: Send PII data to PII service
  if (row.real_name || row.email || row.phone || row.address) {
    // const piiService = new PiiService();
    // await piiService.storePii(rmProfileId, {
    //   realName: row.real_name,
    //   email: row.email,
    //   phone: row.phone,
    //   address: row.address,
    // });
    logger.info(`PII data for ${customerId} would be sent to PII service`);
  }
}

/**
 * Process customer update
 */
async function processCustomerUpdate(
  prisma: PrismaClient,
  _schemaName: string,
  row: CustomerCsvRow,
  options: {
    talentId: string;
    profileStoreId: string;
    userId: string;
    lookupData: LookupData;
  }
): Promise<boolean> {
  // Find customer by platform identity
  if (!row.platform_code || !row.platform_uid) {
    return false;
  }

  const platformId = options.lookupData.platforms.get(row.platform_code);
  if (!platformId) {
    return false;
  }

  const identity = await prisma.platformIdentity.findFirst({
    where: {
      platformId,
      platformUid: row.platform_uid,
      customer: {
        talentId: options.talentId,
      },
    },
    include: { customer: true },
  });

  if (!identity) {
    return false;
  }

  // Update customer profile
  await prisma.customerProfile.update({
    where: { id: identity.customerId },
    data: {
      nickname: row.nickname || identity.customer.nickname,
      tags: row.tags
        ? row.tags.split(',').map(t => t.trim()).filter(Boolean)
        : identity.customer.tags,
      notes: row.notes || identity.customer.notes,
      updatedBy: options.userId,
      version: { increment: 1 },
    },
  });

  return true;
}

/**
 * Process membership sync
 */
async function processMembershipSync(
  prisma: PrismaClient,
  _schemaName: string,
  row: CustomerCsvRow,
  options: {
    talentId: string;
    profileStoreId: string;
    lookupData: LookupData;
  }
) {
  // Similar to update but focuses on membership records
  // Used for external membership sync (e.g., from Bilibili API)

  if (!row.platform_code || !row.platform_uid) {
    throw new Error('platform_code and platform_uid are required for membership sync');
  }

  const platformId = options.lookupData.platforms.get(row.platform_code);
  if (!platformId) {
    throw new Error(`Invalid platform_code: ${row.platform_code}`);
  }

  // Find or create customer
  const identity = await prisma.platformIdentity.findFirst({
    where: {
      platformId,
      platformUid: row.platform_uid,
      customer: {
        talentId: options.talentId,
      },
    },
  });

  if (!identity) {
    // For membership sync, we might want to create the customer
    throw new Error(`Customer not found for platform ${row.platform_code}:${row.platform_uid}`);
  }

  // Upsert membership record
  const classId = row.membership_class_code ? options.lookupData.membershipClasses.get(row.membership_class_code) : undefined;
  const typeId = classId && row.membership_type_code ? options.lookupData.membershipTypes.get(`${classId}:${row.membership_type_code}`) : undefined;
  const levelId = typeId && row.membership_level_code ? options.lookupData.membershipLevels.get(`${typeId}:${row.membership_level_code}`) : undefined;

  if (classId && typeId && levelId) {
    // Find existing membership record
    const existingRecord = await prisma.membershipRecord.findFirst({
      where: {
        customerId: identity.customerId,
        platformId,
        membershipTypeId: typeId,
      },
    });

    if (existingRecord) {
      // Update existing
      await prisma.membershipRecord.update({
        where: { id: existingRecord.id },
        data: {
          membershipLevelId: levelId,
          validTo: row.valid_to ? new Date(row.valid_to) : null,
          externalSyncedAt: new Date(),
        },
      });
    } else {
      // Create new
      await prisma.membershipRecord.create({
        data: {
          customerId: identity.customerId,
          platformId,
          membershipClassId: classId,
          membershipTypeId: typeId,
          membershipLevelId: levelId,
          validFrom: row.valid_from ? new Date(row.valid_from) : new Date(),
          validTo: row.valid_to ? new Date(row.valid_to) : null,
          externalSyncedAt: new Date(),
        },
      });
    }
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  status: string,
  result?: ImportJobResult,
  errorMessage?: string
) {
  const now = new Date();

  if (status === 'processing') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, started_at = $2
      WHERE id = $3
    `, status, now, jobId);
  } else if (status === 'completed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, 
          completed_at = $2, 
          total_rows = $3,
          processed_rows = $4,
          success_count = $5,
          error_count = $6,
          error_details = $7
      WHERE id = $8
    `, status, now, result?.totalRows || 0, (result?.successRows || 0) + (result?.failedRows || 0),
       result?.successRows || 0, result?.failedRows || 0,
       JSON.stringify(result?.errors?.slice(0, 100) || []), // Limit error details
       jobId);
  } else if (status === 'failed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, 
          completed_at = $2,
          error_details = $3
      WHERE id = $4
    `, status, now, JSON.stringify([{ row: 0, message: errorMessage }]), jobId);
  }
}
