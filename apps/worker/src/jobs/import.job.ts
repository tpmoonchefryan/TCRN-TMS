// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import Job Processor (PRD §11.7)

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as Minio from 'minio';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';

import { importLogger as logger } from '../logger';

const IMPORTS_BUCKET = 'imports';

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
  consumerCode?: string;
  totalRows?: number;
  defaultProfileType?: 'individual' | 'company';
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
  warningRows: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  warnings: Array<{ row: number; field?: string; message: string }>;
}

/**
 * CSV row interface for customer import
 */
interface CustomerCsvRow {
  external_id?: string;
  nickname: string;
  profile_type?: string;
  given_name?: string;
  family_name?: string;
  gender?: string;
  birth_date?: string;
  primary_language?: string;
  phone_type?: string;
  phone_number?: string;
  email_type?: string;
  email_address?: string;
  status_code?: string;
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
  company_legal_name?: string;
  company_short_name?: string;
  registration_number?: string;
  vat_id?: string;
  establishment_date?: string;
  business_segment_code?: string;
  website?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_department?: string;
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
  businessSegments: Map<string, string>;
  consumers: Map<string, string>;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function tenantTable(schemaName: string, tableName: string): string {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
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

async function downloadImportFile(objectName: string, destinationPath: string): Promise<void> {
  const minioClient = createMinioClient();
  const objectStream = await minioClient.getObject(IMPORTS_BUCKET, objectName);

  await pipeline(objectStream, fs.createWriteStream(destinationPath));
}

/**
 * Import job processor (PRD §11.7)
 */
export const importJobProcessor: Processor<ImportJobData, ImportJobResult> = async (
  job: Job<ImportJobData, ImportJobResult>
) => {
  const {
    jobId,
    tenantId,
    tenantSchemaName,
    talentId,
    profileStoreId,
    userId,
    filePath,
    jobType,
    consumerCode,
    totalRows: expectedTotalRows,
    defaultProfileType,
    options,
  } = job.data;
  const startTime = Date.now();
  const tempFilePath = path.join(os.tmpdir(), `import_${jobId}.csv`);

  logger.info(`Processing import job ${jobId} for tenant ${tenantId}, talent ${talentId}`);
  logger.info(`File: ${filePath}, Type: ${jobType}`);

  const prisma = new PrismaClient();
  const result: ImportJobResult = {
    totalRows: 0,
    successRows: 0,
    failedRows: 0,
    skippedRows: 0,
    warningRows: 0,
    errors: [],
    warnings: [],
  };

  try {
    // 1. Update job status to processing
    await updateJobStatus(prisma, tenantSchemaName, jobId, 'running');

    // 2. Download file from MinIO
    logger.info(`Downloading to: ${tempFilePath}`);
    await downloadImportFile(filePath, tempFilePath);

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
        })
      );

    let rowNumber = 1; // Start after header

    for await (const row of parser) {
      rowNumber++;
      result.totalRows++;

      try {
        // Validate row
        const validation = validateRow(
          row as CustomerCsvRow,
          lookupData,
          rowNumber,
          defaultProfileType,
          consumerCode,
        );
        
        if (validation.warnings.length > 0) {
          result.warningRows++;
          validation.warnings.forEach(w => {
            result.warnings.push({ row: rowNumber, message: w });
          });
        }

        if (!validation.valid) {
          result.failedRows++;
          validation.errors.forEach(e => {
            result.errors.push({ row: rowNumber, message: e });
          });
          await insertImportJobErrors(
            prisma,
            tenantSchemaName,
            jobId,
            rowNumber,
            validation.errors.map((message) => ({
              errorCode: 'VALIDATION_ERROR',
              errorMessage: message,
              originalData: JSON.stringify(row),
            })),
          );
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
              consumerCode,
              defaultProfileType,
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
        await insertImportJobErrors(prisma, tenantSchemaName, jobId, rowNumber, [
          {
            errorCode: 'PROCESSING_ERROR',
            errorMessage,
            originalData: JSON.stringify(row),
          },
        ]);
      }

      // Update progress every 100 rows
      if (rowNumber % 100 === 0) {
        const processedRows = result.successRows + result.failedRows + result.skippedRows;
        const progress = expectedTotalRows
          ? Math.round((processedRows / expectedTotalRows) * 100)
          : 0;
        await job.updateProgress(Math.min(progress, 99));
        await updateJobProgress(
          prisma,
          tenantSchemaName,
          jobId,
          processedRows,
          result.successRows,
          result.failedRows,
          result.warningRows,
        );
        logger.info(`Progress: Row ${rowNumber}, Success: ${result.successRows}, Failed: ${result.failedRows}`);
      }
    }

    // 5. Update job status
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
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    await prisma.$disconnect();
  }
};

/**
 * Load lookup data for validation
 */
async function loadLookupData(prisma: PrismaClient, schemaName: string) {
  const [
    platforms,
    membershipClasses,
    membershipTypes,
    membershipLevels,
    customerStatuses,
    businessSegments,
    consumers,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM ${tenantTable(schemaName, 'social_platform')} WHERE is_active = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM ${tenantTable(schemaName, 'membership_class')} WHERE is_active = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string; membershipClassId: string }>>(
      `
        SELECT id, code, membership_class_id as "membershipClassId"
        FROM ${tenantTable(schemaName, 'membership_type')}
        WHERE is_active = true
      `,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string; membershipTypeId: string }>>(
      `
        SELECT id, code, membership_type_id as "membershipTypeId"
        FROM ${tenantTable(schemaName, 'membership_level')}
        WHERE is_active = true
      `,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM ${tenantTable(schemaName, 'customer_status')} WHERE is_active = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM ${tenantTable(schemaName, 'business_segment')} WHERE is_active = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM ${tenantTable(schemaName, 'consumer')} WHERE is_active = true`,
    ),
  ]);

  return {
    platforms: new Map(platforms.map(p => [p.code, p.id])),
    membershipClasses: new Map(membershipClasses.map(m => [m.code, m.id])),
    membershipTypes: new Map(membershipTypes.map(m => [`${m.membershipClassId}:${m.code}`, m.id])),
    membershipLevels: new Map(membershipLevels.map(m => [`${m.membershipTypeId}:${m.code}`, m.id])),
    customerStatuses: new Map(customerStatuses.map(s => [s.code, s.id])),
    businessSegments: new Map(businessSegments.map((segment) => [segment.code, segment.id])),
    consumers: new Map(consumers.map((consumer) => [consumer.code, consumer.id])),
  };
}

/**
 * Validate a CSV row
 */
function validateRow(
  row: CustomerCsvRow,
  lookupData: LookupData,
  _rowNumber: number,
  defaultProfileType?: 'individual' | 'company',
  consumerCode?: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolvedProfileType = row.profile_type || defaultProfileType || 'individual';

  // Required fields
  if (!row.nickname?.trim()) {
    errors.push('Nickname is required');
  }

  // Profile type validation
  if (!['individual', 'company'].includes(resolvedProfileType)) {
    errors.push(`Invalid profile_type: ${row.profile_type}. Must be 'individual' or 'company'`);
  }

  if (resolvedProfileType === 'company' && !row.company_legal_name?.trim()) {
    errors.push('company_legal_name is required for company import');
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

  if (row.establishment_date && isNaN(Date.parse(row.establishment_date))) {
    errors.push(`Invalid establishment_date date: ${row.establishment_date}`);
  }

  if (row.business_segment_code && !lookupData.businessSegments.has(row.business_segment_code)) {
    errors.push(`Invalid business_segment_code: ${row.business_segment_code}`);
  }

  if (row.status_code && !lookupData.customerStatuses.has(row.status_code)) {
    errors.push(`Invalid status_code: ${row.status_code}`);
  }

  if (row.external_id && !consumerCode) {
    errors.push('consumerCode is required when external_id is provided');
  }

  if (row.external_id && consumerCode && !lookupData.consumers.has(consumerCode)) {
    errors.push(`Invalid consumerCode: ${consumerCode}`);
  }

  // Email format validation
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    warnings.push(`Invalid email format: ${row.email}`);
  }

  if (row.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contact_email)) {
    warnings.push(`Invalid contact_email format: ${row.contact_email}`);
  }

  if (row.email_address) {
    const emailAddresses = row.email_address.split('|').map((part) => part.trim()).filter(Boolean);
    for (const email of emailAddresses) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        warnings.push(`Invalid email_address format: ${email}`);
      }
    }
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

function firstDelimitedValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split('|')
    .map((part) => part.trim())
    .find(Boolean);
}

/**
 * Process customer create
 */
async function processCustomerCreate(
  prisma: PrismaClient,
  schemaName: string,
  row: CustomerCsvRow,
  options: {
    talentId: string;
    profileStoreId: string;
    userId: string;
    lookupData: LookupData;
    consumerCode?: string;
    defaultProfileType?: 'individual' | 'company';
    skipDuplicates?: boolean;
  }
) {
  const customerId = uuidv4();
  const rmProfileId = uuidv4(); // PII token
  const profileType = row.profile_type || options.defaultProfileType || 'individual';
  const statusId = row.status_code
    ? (options.lookupData.customerStatuses.get(row.status_code) ?? null)
    : null;
  const derivedRealName = row.real_name || [row.family_name, row.given_name].filter(Boolean).join('') || undefined;
  const derivedEmail = row.email || firstDelimitedValue(row.email_address);
  const derivedPhone = row.phone || firstDelimitedValue(row.phone_number);

  // Generate search hints for individual profiles
  const searchHintName = profileType === 'individual' ? generateSearchHintName(derivedRealName) : null;
  const searchHintPhoneLast4 = profileType === 'individual' ? generateSearchHintPhoneLast4(derivedPhone) : null;

  // Create customer profile
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${tenantTable(schemaName, 'customer_profile')} (
        id,
        talent_id,
        profile_store_id,
        origin_talent_id,
        rm_profile_id,
        profile_type,
        nickname,
        primary_language,
        status_id,
        tags,
        source,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6,
        $7,
        $8,
        $9::uuid,
        $10::text[],
        $11,
        $12,
        NOW(),
        NOW(),
        $13::uuid,
        $14::uuid
      )
    `,
    customerId,
    options.talentId,
    options.profileStoreId,
    options.talentId,
    rmProfileId,
    profileType,
    row.nickname,
    row.primary_language || null,
    statusId,
    row.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || [],
    row.source || 'import',
    row.notes ?? null,
    options.userId,
    options.userId,
  );

  if (profileType === 'company') {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${tenantTable(schemaName, 'customer_company_info')} (
          customer_id,
          company_legal_name,
          company_short_name,
          registration_number,
          vat_id,
          establishment_date,
          business_segment_id,
          website,
          created_at,
          updated_at
        ) VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6::date,
          $7::uuid,
          $8,
          NOW(),
          NOW()
        )
      `,
      customerId,
      row.company_legal_name || row.nickname,
      row.company_short_name || null,
      row.registration_number || null,
      row.vat_id || null,
      row.establishment_date ? new Date(row.establishment_date) : null,
      row.business_segment_code
        ? (options.lookupData.businessSegments.get(row.business_segment_code) ?? null)
        : null,
      row.website || null,
    );
  }

  if (row.external_id && options.consumerCode) {
    const consumerId = options.lookupData.consumers.get(options.consumerCode);
    if (consumerId) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${tenantTable(schemaName, 'customer_external_id')} (
            customer_id,
            profile_store_id,
            consumer_id,
            external_id,
            created_by
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4,
            $5::uuid
          )
        `,
        customerId,
        options.profileStoreId,
        consumerId,
        row.external_id,
        options.userId,
      );
    }
  }

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
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${tenantTable(schemaName, 'platform_identity')} (
            customer_id,
            platform_id,
            platform_uid,
            is_current,
            is_verified,
            captured_at,
            updated_at
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            true,
            false,
            NOW(),
            NOW()
          )
        `,
        customerId,
        platformId,
        row.platform_uid,
      );
    }
  }

  // Create membership record if provided
  if (row.membership_class_code && row.membership_type_code && row.membership_level_code) {
    const classId = options.lookupData.membershipClasses.get(row.membership_class_code);
    const typeId = options.lookupData.membershipTypes.get(`${classId}:${row.membership_type_code}`);
    const levelId = options.lookupData.membershipLevels.get(`${typeId}:${row.membership_level_code}`);
    const platformId = row.platform_code ? options.lookupData.platforms.get(row.platform_code) : null;

    if (classId && typeId && levelId && platformId) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${tenantTable(schemaName, 'membership_record')} (
            customer_id,
            platform_id,
            membership_class_id,
            membership_type_id,
            membership_level_id,
            valid_from,
            valid_to,
            auto_renew,
            created_at,
            updated_at,
            created_by,
            updated_by
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            $5::uuid,
            $6::timestamptz,
            $7::timestamptz,
            false,
            NOW(),
            NOW(),
            $8::uuid,
            $9::uuid
          )
        `,
        customerId,
        platformId,
        classId,
        typeId,
        levelId,
        row.valid_from ? new Date(row.valid_from) : new Date(),
        row.valid_to ? new Date(row.valid_to) : null,
        options.userId,
        options.userId,
      );
    }
  }

  // TODO: Send PII data to PII service
  if (derivedRealName || derivedEmail || derivedPhone || row.address) {
    // const piiService = new PiiService();
    // await piiService.storePii(rmProfileId, {
    //   realName: derivedRealName,
    //   email: derivedEmail,
    //   phone: derivedPhone,
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
  schemaName: string,
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

  const identities = await prisma.$queryRawUnsafe<Array<{
    customerId: string;
    nickname: string;
    tags: string[];
    notes: string | null;
  }>>(
    `
      SELECT
        pi.customer_id as "customerId",
        cp.nickname,
        cp.tags,
        cp.notes
      FROM ${tenantTable(schemaName, 'platform_identity')} pi
      JOIN ${tenantTable(schemaName, 'customer_profile')} cp
        ON cp.id = pi.customer_id
      WHERE pi.platform_id = $1::uuid
        AND pi.platform_uid = $2
        AND cp.talent_id = $3::uuid
      LIMIT 1
    `,
    platformId,
    row.platform_uid,
    options.talentId,
  );
  const identity = identities[0];

  if (!identity) {
    return false;
  }

  // Update customer profile
  await prisma.$executeRawUnsafe(
    `
      UPDATE ${tenantTable(schemaName, 'customer_profile')}
      SET nickname = $1,
          tags = $2::text[],
          notes = $3,
          updated_by = $4::uuid,
          version = version + 1,
          updated_at = NOW()
      WHERE id = $5::uuid
    `,
    row.nickname || identity.nickname,
    row.tags
      ? row.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : identity.tags,
    row.notes || identity.notes,
    options.userId,
    identity.customerId,
  );

  return true;
}

/**
 * Process membership sync
 */
async function processMembershipSync(
  prisma: PrismaClient,
  schemaName: string,
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
  const identities = await prisma.$queryRawUnsafe<Array<{ customerId: string }>>(
    `
      SELECT pi.customer_id as "customerId"
      FROM ${tenantTable(schemaName, 'platform_identity')} pi
      JOIN ${tenantTable(schemaName, 'customer_profile')} cp
        ON cp.id = pi.customer_id
      WHERE pi.platform_id = $1::uuid
        AND pi.platform_uid = $2
        AND cp.talent_id = $3::uuid
      LIMIT 1
    `,
    platformId,
    row.platform_uid,
    options.talentId,
  );
  const identity = identities[0];

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
    const existingRecords = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM ${tenantTable(schemaName, 'membership_record')}
        WHERE customer_id = $1::uuid
          AND platform_id = $2::uuid
          AND membership_type_id = $3::uuid
        LIMIT 1
      `,
      identity.customerId,
      platformId,
      typeId,
    );
    const existingRecord = existingRecords[0];

    if (existingRecord) {
      // Update existing
      await prisma.$executeRawUnsafe(
        `
          UPDATE ${tenantTable(schemaName, 'membership_record')}
          SET membership_level_id = $1::uuid,
              valid_to = $2::timestamptz,
              external_synced_at = $3::timestamptz,
              updated_at = NOW()
          WHERE id = $4::uuid
        `,
        levelId,
        row.valid_to ? new Date(row.valid_to) : null,
        new Date(),
        existingRecord.id,
      );
    } else {
      // Create new
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${tenantTable(schemaName, 'membership_record')} (
            customer_id,
            platform_id,
            membership_class_id,
            membership_type_id,
            membership_level_id,
            valid_from,
            valid_to,
            external_synced_at,
            created_at,
            updated_at
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            $5::uuid,
            $6::timestamptz,
            $7::timestamptz,
            $8::timestamptz,
            NOW(),
            NOW()
          )
        `,
        identity.customerId,
        platformId,
        classId,
        typeId,
        levelId,
        row.valid_from ? new Date(row.valid_from) : new Date(),
        row.valid_to ? new Date(row.valid_to) : null,
        new Date(),
      );
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

  if (status === 'running') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, started_at = $2
      WHERE id = $3::uuid
    `, 'running', now, jobId);
  } else if (status === 'completed') {
    const processedRows = (result?.successRows || 0) + (result?.failedRows || 0) + (result?.skippedRows || 0);
    const finalStatus =
      (result?.failedRows || 0) === 0
        ? 'success'
        : (result?.successRows || 0) === 0
          ? 'failed'
          : 'partial';

    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, 
          completed_at = $2, 
          total_rows = $3,
          processed_rows = $4,
          success_rows = $5,
          failed_rows = $6,
          warning_rows = $7
      WHERE id = $8::uuid
    `, finalStatus, now, result?.totalRows || 0, processedRows,
       result?.successRows || 0, result?.failedRows || 0, result?.warningRows || 0,
       jobId);
  } else if (status === 'failed') {
    await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET status = $1, 
          completed_at = $2,
          processed_rows = $3,
          success_rows = $4,
          failed_rows = $5,
          warning_rows = $6
      WHERE id = $7::uuid
    `, 'failed', now,
       (result?.successRows || 0) + (result?.failedRows || 0) + (result?.skippedRows || 0),
       result?.successRows || 0,
       (result?.failedRows || 0) || 1,
       result?.warningRows || 0,
       jobId);

    if (errorMessage) {
      await insertImportJobErrors(prisma, schemaName, jobId, 0, [
        {
          errorCode: 'JOB_FAILED',
          errorMessage,
          originalData: '',
        },
      ]);
    }
  }
}

async function updateJobProgress(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  processedRows: number,
  successRows: number,
  failedRows: number,
  warningRows: number,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".import_job
      SET processed_rows = $1,
          success_rows = $2,
          failed_rows = $3,
          warning_rows = $4,
          status = 'running',
          started_at = COALESCE(started_at, NOW())
      WHERE id = $5::uuid
    `, processedRows, successRows, failedRows, warningRows, jobId);
}

async function insertImportJobErrors(
  prisma: PrismaClient,
  schemaName: string,
  jobId: string,
  rowNumber: number,
  errors: Array<{
    errorCode: string;
    errorMessage: string;
    originalData: string;
  }>,
): Promise<void> {
  for (const error of errors) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".import_job_error (
        id, import_job_id, row_number, error_code, error_message, original_data, created_at
      )
      VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, NOW()
      )
    `, jobId, rowNumber, error.errorCode, error.errorMessage, error.originalData);
  }
}
