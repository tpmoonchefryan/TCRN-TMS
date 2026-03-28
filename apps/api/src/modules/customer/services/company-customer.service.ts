// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
    CreateCompanyCustomerDto,
    CustomerAction,
    ProfileType,
    UpdateCompanyCustomerDto,
} from '../dto/customer.dto';

/**
 * Company Customer Service
 * Handles company customer profile operations (no PII separation)
 */
@Injectable()
export class CompanyCustomerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  /**
   * Create company customer profile
   */
  async create(dto: CreateCompanyCustomerDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get talent and its profile store using raw SQL with tenant schema
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileStoreId: string | null;
    }>>(`
      SELECT id, profile_store_id as "profileStoreId"
      FROM "${context.tenantSchema}".talent
      WHERE id = $1::uuid
    `, dto.talentId);

    const talent = talents[0];

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (!talent.profileStoreId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Talent has no profile store configured',
      });
    }

    // Get status if provided
    let statusId: string | null = null;
    if (dto.statusCode) {
      const statuses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id
        FROM "${schema}".customer_status
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, dto.statusCode);
      statusId = statuses[0]?.id ?? null;
    }

    // Get business segment if provided
    let businessSegmentId: string | null = null;
    if (dto.businessSegmentCode) {
      const segments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id
        FROM "${schema}".business_segment
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, dto.businessSegmentCode);
      businessSegmentId = segments[0]?.id ?? null;
    }

    // Generate rm_profile_id (not used for company profiles but required by schema)
    const rmProfileId = uuidv4();

    // Create customer profile with company info
    const customer = await prisma.$transaction(async (tx) => {
      const insertedCustomers = await tx.$queryRawUnsafe<Array<{
        id: string;
        nickname: string;
        createdAt: Date;
      }>>(`
        INSERT INTO "${schema}".customer_profile (
          id, talent_id, profile_store_id, origin_talent_id, rm_profile_id,
          profile_type, nickname, primary_language, status_id, tags, source,
          notes, created_by, updated_by, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid, $3::uuid,
          $4, $5, $6, $7::uuid, $8::text[], $9,
          $10, $11::uuid, $11::uuid, NOW(), NOW()
        )
        RETURNING id, nickname, created_at as "createdAt"
      `,
        dto.talentId,
        talent.profileStoreId,
        rmProfileId,
        ProfileType.COMPANY,
        dto.nickname,
        dto.primaryLanguage ?? null,
        statusId,
        dto.tags || [],
        dto.source ?? null,
        dto.notes ?? null,
        context.userId,
      );

      const newCustomer = insertedCustomers[0];

      // Create company info
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schema}".customer_company_info (
          id, customer_id, company_legal_name, company_short_name, registration_number,
          vat_id, establishment_date, business_segment_id, website,
          contact_name, contact_phone, contact_email, contact_department,
          created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, $2, $3, $4,
          $5, $6, $7::uuid, $8, $9, $10, $11, $12, NOW(), NOW()
        )
      `,
        newCustomer.id,
        dto.companyLegalName,
        dto.companyShortName ?? null,
        dto.registrationNumber ?? null,
        dto.vatId ?? null,
        dto.establishmentDate ? new Date(dto.establishmentDate) : null,
        businessSegmentId,
        dto.website ?? null,
        dto.contactName ?? null,
        dto.contactPhone ?? null,
        dto.contactEmail ?? null,
        dto.contactDepartment ?? null,
      );

      // Create external ID if provided
      if (dto.externalId && dto.consumerCode) {
        const consumers = await tx.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id
          FROM "${schema}".consumer
          WHERE code = $1 AND is_active = true
          LIMIT 1
        `, dto.consumerCode);

        if (consumers[0]) {
          await tx.$executeRawUnsafe(`
            INSERT INTO "${schema}".customer_external_id (
              id, customer_id, profile_store_id, consumer_id, external_id, created_by, created_at
            )
            VALUES (
              gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, NOW()
            )
          `,
            newCustomer.id,
            talent.profileStoreId,
            consumers[0].id,
            dto.externalId,
            context.userId,
          );
        }
      }

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'customer_profile',
        objectId: newCustomer.id,
        objectName: dto.nickname,
        newValue: {
          profileType: ProfileType.COMPANY,
          nickname: dto.nickname,
          companyLegalName: dto.companyLegalName,
          companyShortName: dto.companyShortName,
          statusId,
          tags: dto.tags,
          source: dto.source,
        },
      }, context);

      // Record access log
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schema}".customer_access_log (
          id, customer_id, profile_store_id, talent_id, action,
          operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
          $5::uuid, $6, $7::inet, $8, $9, NOW()
        )
      `,
        newCustomer.id,
        talent.profileStoreId,
        dto.talentId,
        CustomerAction.CREATE,
        context.userId,
        context.userName,
        context.ipAddress || '0.0.0.0',
        context.userAgent,
        context.requestId,
      );

      return newCustomer;
    });

    return {
      id: customer.id,
      profileType: ProfileType.COMPANY,
      nickname: customer.nickname,
      company: {
        companyLegalName: dto.companyLegalName,
        companyShortName: dto.companyShortName,
      },
      createdAt: customer.createdAt,
    };
  }

  /**
   * Update company customer profile
   */
  async update(
    id: string,
    talentId: string,
    dto: UpdateCompanyCustomerDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access (multi-tenant aware)
    const customer = await this.verifyAccess(id, talentId, context);

    // Check version
    if (customer.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // Get status if provided using raw SQL
    let statusId: string | null = null;
    if (dto.statusCode !== undefined && dto.statusCode) {
      const statuses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".customer_status
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, dto.statusCode);
      statusId = statuses[0]?.id ?? null;
    }

    // Get business segment if provided using raw SQL
    let businessSegmentId: string | null = null;
    if (dto.businessSegmentCode !== undefined && dto.businessSegmentCode) {
      const segments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".business_segment
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, dto.businessSegmentCode);
      businessSegmentId = segments[0]?.id ?? null;
    }

    // Build profile update SET clause
    const profileSetParts: string[] = [
      'last_modified_talent_id = $1::uuid',
      'updated_by = $2::uuid',
      'updated_at = NOW()',
      'version = version + 1',
    ];
    const profileParams: (string | string[] | Date | null)[] = [talentId, context.userId];
    let paramIndex = 3;

    if (dto.nickname !== undefined) {
      profileSetParts.push(`nickname = $${paramIndex++}`);
      profileParams.push(dto.nickname);
    }
    if (dto.primaryLanguage !== undefined) {
      profileSetParts.push(`primary_language = $${paramIndex++}`);
      profileParams.push(dto.primaryLanguage);
    }
    if (statusId !== null) {
      profileSetParts.push(`status_id = $${paramIndex++}::uuid`);
      profileParams.push(statusId);
    }
    if (dto.tags !== undefined) {
      profileSetParts.push(`tags = $${paramIndex++}::text[]`);
      profileParams.push(dto.tags);
    }
    if (dto.notes !== undefined) {
      profileSetParts.push(`notes = $${paramIndex++}`);
      profileParams.push(dto.notes);
    }

    // Update customer profile using raw SQL
    const updatedProfiles = await prisma.$queryRawUnsafe<Array<{
      id: string;
      nickname: string;
      version: number;
      updatedAt: Date;
    }>>(`
      UPDATE "${schema}".customer_profile
      SET ${profileSetParts.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING id, nickname, version, updated_at as "updatedAt"
    `, ...profileParams, id);

    const updated = updatedProfiles[0];

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found or update failed',
      });
    }

    // Build company info update if there are changes
    const companySetParts: string[] = [];
    const companyParams: (string | Date | null)[] = [];
    let companyParamIndex = 1;

    if (dto.companyLegalName !== undefined) {
      companySetParts.push(`company_legal_name = $${companyParamIndex++}`);
      companyParams.push(dto.companyLegalName);
    }
    if (dto.companyShortName !== undefined) {
      companySetParts.push(`company_short_name = $${companyParamIndex++}`);
      companyParams.push(dto.companyShortName);
    }
    if (dto.registrationNumber !== undefined) {
      companySetParts.push(`registration_number = $${companyParamIndex++}`);
      companyParams.push(dto.registrationNumber);
    }
    if (dto.vatId !== undefined) {
      companySetParts.push(`vat_id = $${companyParamIndex++}`);
      companyParams.push(dto.vatId);
    }
    if (dto.establishmentDate !== undefined) {
      companySetParts.push(`establishment_date = $${companyParamIndex++}`);
      companyParams.push(dto.establishmentDate ? new Date(dto.establishmentDate) : null);
    }
    if (businessSegmentId !== null) {
      companySetParts.push(`business_segment_id = $${companyParamIndex++}::uuid`);
      companyParams.push(businessSegmentId);
    }
    if (dto.website !== undefined) {
      companySetParts.push(`website = $${companyParamIndex++}`);
      companyParams.push(dto.website);
    }
    if (dto.contactName !== undefined) {
      companySetParts.push(`contact_name = $${companyParamIndex++}`);
      companyParams.push(dto.contactName);
    }
    if (dto.contactPhone !== undefined) {
      companySetParts.push(`contact_phone = $${companyParamIndex++}`);
      companyParams.push(dto.contactPhone);
    }
    if (dto.contactEmail !== undefined) {
      companySetParts.push(`contact_email = $${companyParamIndex++}`);
      companyParams.push(dto.contactEmail);
    }
    if (dto.contactDepartment !== undefined) {
      companySetParts.push(`contact_department = $${companyParamIndex++}`);
      companyParams.push(dto.contactDepartment);
    }

    // Update or create company info if there are changes
    if (companySetParts.length > 0) {
      // First try to update existing record
      const affectedRows = await prisma.$executeRawUnsafe(`
        UPDATE "${schema}".customer_company_info
        SET ${companySetParts.join(', ')}
        WHERE customer_id = $${companyParamIndex}::uuid
      `, ...companyParams, id);
      
      // If no rows were updated, the record doesn't exist - create it
      if (affectedRows === 0) {
        // Build INSERT statement with all provided fields
        // Note: id uses gen_random_uuid() in SQL, customer_id is passed as parameter
        // updated_at is required (NOT NULL) so we set it to NOW()
        const insertColumns = ['id', 'customer_id', 'updated_at'];
        const insertValues = ['gen_random_uuid()', '$1::uuid', 'NOW()'];
        const insertParams: (string | Date | null)[] = [id];
        let insertParamIndex = 2;

        if (dto.companyLegalName !== undefined) {
          insertColumns.push('company_legal_name');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.companyLegalName);
        }
        if (dto.companyShortName !== undefined) {
          insertColumns.push('company_short_name');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.companyShortName);
        }
        if (dto.registrationNumber !== undefined) {
          insertColumns.push('registration_number');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.registrationNumber);
        }
        if (dto.vatId !== undefined) {
          insertColumns.push('vat_id');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.vatId);
        }
        if (dto.establishmentDate !== undefined) {
          insertColumns.push('establishment_date');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.establishmentDate ? new Date(dto.establishmentDate) : null);
        }
        if (businessSegmentId !== null) {
          insertColumns.push('business_segment_id');
          insertValues.push(`$${insertParamIndex++}::uuid`);
          insertParams.push(businessSegmentId);
        }
        if (dto.website !== undefined) {
          insertColumns.push('website');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.website);
        }
        if (dto.contactName !== undefined) {
          insertColumns.push('contact_name');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.contactName);
        }
        if (dto.contactPhone !== undefined) {
          insertColumns.push('contact_phone');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.contactPhone);
        }
        if (dto.contactEmail !== undefined) {
          insertColumns.push('contact_email');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.contactEmail);
        }
        if (dto.contactDepartment !== undefined) {
          insertColumns.push('contact_department');
          insertValues.push(`$${insertParamIndex++}`);
          insertParams.push(dto.contactDepartment);
        }

        await prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}".customer_company_info (${insertColumns.join(', ')})
          VALUES (${insertValues.join(', ')})
        `, ...insertParams);
      }
    }

    // Record change log
    await this.changeLogService.create(prisma, {
      action: 'update',
      objectType: 'customer_profile',
      objectId: id,
      objectName: updated.nickname,
      oldValue: {
        nickname: customer.nickname,
        primaryLanguage: customer.primaryLanguage,
        statusId: customer.statusId,
        tags: customer.tags,
        notes: customer.notes,
      },
      newValue: {
        nickname: updated.nickname,
        ...dto,
      },
    }, context);

    // Record access log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".customer_access_log (
        id, customer_id, profile_store_id, talent_id, action,
        field_changes, operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
        $5::jsonb, $6::uuid, $7, $8::inet, $9, $10, NOW()
      )
    `, id, customer.profileStoreId, talentId, CustomerAction.UPDATE,
       JSON.stringify(dto), context.userId, context.userName, 
       context.ipAddress || '0.0.0.0', context.userAgent, context.requestId);

    return {
      id: updated.id,
      nickname: updated.nickname,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Verify talent has access to customer and it's a company profile (multi-tenant aware)
   */
  private async verifyAccess(customerId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Query customer from tenant schema with all needed fields for change log
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileType: string;
      profileStoreId: string | null;
      nickname: string;
      version: number;
      primaryLanguage: string | null;
      statusId: string | null;
      tags: string[];
      notes: string | null;
    }>>(`
      SELECT id, profile_type as "profileType", profile_store_id as "profileStoreId", 
             nickname, version, primary_language as "primaryLanguage",
             status_id as "statusId", tags, notes
      FROM "${schema}".customer_profile
      WHERE id = $1::uuid
    `, customerId);

    const customer = customers[0];

    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    if (customer.profileType !== ProfileType.COMPANY) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Customer is not a company profile',
      });
    }

    // Query talent from tenant schema
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileStoreId: string | null;
    }>>(`
      SELECT id, profile_store_id as "profileStoreId"
      FROM "${schema}".talent
      WHERE id = $1::uuid
    `, talentId);

    const talent = talents[0];

    if (!talent || talent.profileStoreId !== customer.profileStoreId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    return customer;
  }
}
