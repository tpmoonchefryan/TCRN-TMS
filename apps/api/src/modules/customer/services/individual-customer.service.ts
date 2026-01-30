// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, TechEventType, type RequestContext } from '@tcrn/shared';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import {
    CreateIndividualCustomerDto,
    CustomerAction,
    ProfileType,
    UpdateIndividualCustomerDto,
    UpdateIndividualPiiDto,
} from '../dto/customer.dto';

/**
 * Individual Customer Service
 * Handles individual customer profile operations with PII separation
 */
@Injectable()
export class IndividualCustomerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  /**
   * Create individual customer profile
   */
  async create(dto: CreateIndividualCustomerDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

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
      const status = await prisma.customerStatus.findFirst({
        where: { code: dto.statusCode, isActive: true },
      });
      if (status) {
        statusId = status.id;
      }
    }

    // Generate rm_profile_id for PII link
    // In production, this would be created by the PII service
    const rmProfileId = uuidv4();

    // Generate search hints from PII data
    const searchHintName = this.generateSearchHintName(
      dto.pii?.givenName,
      dto.pii?.familyName,
    );
    const searchHintPhoneLast4 = this.generateSearchHintPhoneLast4(
      dto.pii?.phoneNumbers,
    );

    // Create customer profile
    const customer = await prisma.$transaction(async (tx) => {
      // Create customer profile
      const newCustomer = await tx.customerProfile.create({
        data: {
          talentId: dto.talentId,
          profileStoreId: talent.profileStoreId ?? '',
          originTalentId: dto.talentId,
          rmProfileId,
          profileType: ProfileType.INDIVIDUAL,
          nickname: dto.nickname,
          primaryLanguage: dto.primaryLanguage,
          statusId,
          tags: dto.tags || [],
          source: dto.source,
          notes: dto.notes,
          createdBy: context.userId,
          updatedBy: context.userId,
        },
      });

      // TODO: Store PII search hints
      // In the current PII design, individual PII data is stored in remote encrypted vault.
      // Search hints (searchHintName, searchHintPhoneLast4) could be:
      // 1. Added as columns to CustomerProfile table, or
      // 2. Stored in a separate tenant-scoped table
      // For now, PII is only linked via rmProfileId
      void searchHintName;
      void searchHintPhoneLast4;

      // Create external ID if provided
      if (dto.externalId && dto.consumerCode) {
        const consumer = await tx.consumer.findFirst({
          where: { code: dto.consumerCode, isActive: true },
        });
        if (consumer) {
          await tx.customerExternalId.create({
            data: {
              customerId: newCustomer.id,
              profileStoreId: talent.profileStoreId ?? '',
              consumerId: consumer.id,
              externalId: dto.externalId,
              createdBy: context.userId,
            },
          });
        }
      }

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'customer_profile',
        objectId: newCustomer.id,
        objectName: dto.nickname,
        newValue: {
          profileType: ProfileType.INDIVIDUAL,
          nickname: dto.nickname,
          primaryLanguage: dto.primaryLanguage,
          statusId,
          tags: dto.tags,
          source: dto.source,
        },
      }, context);

      // Record access log
      await tx.customerAccessLog.create({
        data: {
          customerId: newCustomer.id,
          profileStoreId: talent.profileStoreId ?? '',
          talentId: dto.talentId,
          action: CustomerAction.CREATE,
          operatorId: context.userId,
          operatorName: context.userName,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
      });

      return newCustomer;
    });

    // Log PII creation (would be handled by PII service in production)
    if (dto.pii) {
      await this.techEventLogService.piiAccess(
        TechEventType.PII_ACCESS_REQUESTED,
        'PII data created for new individual customer',
        {
          customerId: customer.id,
          rmProfileId,
          operatorId: context.userId,
        },
        context,
      );
    }

    return {
      id: customer.id,
      profileType: ProfileType.INDIVIDUAL,
      nickname: customer.nickname,
      individual: {
        rmProfileId,
        searchHintName,
        searchHintPhoneLast4,
      },
      createdAt: customer.createdAt,
    };
  }

  /**
   * Update individual customer profile (non-PII fields)
   */
  async update(
    id: string,
    talentId: string,
    dto: UpdateIndividualCustomerDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();

    // Verify access using tenant schema
    const customer = await this.verifyAccess(id, talentId, ProfileType.INDIVIDUAL, context);

    // Check version
    if (customer.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // Get status if provided
    let statusId: string | undefined;
    if (dto.statusCode !== undefined) {
      if (dto.statusCode) {
        const status = await prisma.customerStatus.findFirst({
          where: { code: dto.statusCode, isActive: true },
        });
        statusId = status?.id ?? undefined;
      } else {
        statusId = undefined;
      }
    }

    // Build update data
    const updateData: Prisma.CustomerProfileUpdateInput = {
      lastModifiedTalent: { connect: { id: talentId } },
      updatedBy: context.userId,
      version: { increment: 1 },
    };

    if (dto.nickname !== undefined) updateData.nickname = dto.nickname;
    if (dto.primaryLanguage !== undefined) updateData.primaryLanguage = dto.primaryLanguage;
    if (statusId !== undefined) updateData.status = { connect: { id: statusId } };
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Update
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.customerProfile.update({
        where: { id },
        data: updateData,
      });

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'customer_profile',
        objectId: id,
        objectName: result.nickname,
        oldValue: {
          nickname: customer.nickname,
          primaryLanguage: customer.primaryLanguage,
          statusId: customer.statusId,
          tags: customer.tags,
          notes: customer.notes,
        },
        newValue: {
          nickname: result.nickname,
          primaryLanguage: result.primaryLanguage,
          statusId: result.statusId,
          tags: result.tags,
          notes: result.notes,
        },
      }, context);

      // Record access log
      await tx.customerAccessLog.create({
        data: {
          customerId: id,
          profileStoreId: customer.profileStoreId,
          talentId,
          action: CustomerAction.UPDATE,
          fieldChanges: updateData as Prisma.InputJsonValue,
          operatorId: context.userId,
          operatorName: context.userName,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
      });

      return result;
    });

    return {
      id: updated.id,
      nickname: updated.nickname,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Request PII access token
   * v0.20: Fixed to use multi-tenant raw SQL for access log
   */
  async requestPiiAccess(id: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access using tenant schema
    const customer = await this.verifyAccess(id, talentId, ProfileType.INDIVIDUAL, context);

    // Log the PII access request (pass context for tenant schema)
    await this.techEventLogService.piiAccess(
      TechEventType.PII_ACCESS_REQUESTED,
      'PII access requested for individual customer',
      {
        customerId: id,
        rmProfileId: customer.rmProfileId,
        operatorId: context.userId,
        operatorUsername: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      context,
    );

    // Record access log using tenant schema raw SQL
    // Note: ip_address column is inet type, use NULLIF to handle empty strings
    const ipAddr = context.ipAddress || '0.0.0.0';
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".customer_access_log (
        id, customer_id, profile_store_id, talent_id, action,
        operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
        $5::uuid, $6, $7::inet, $8, $9, NOW()
      )
    `,
      id,
      customer.profileStoreId,
      talentId,
      CustomerAction.PII_VIEW,
      context.userId,
      context.userName,
      ipAddr,
      context.userAgent,
      context.requestId,
    );

    // In production, this would sign a JWT for PII service access
    // For now, return a mock response
    return {
      accessToken: `mock_pii_token_${uuidv4()}`,
      piiProfileId: customer.rmProfileId,
      expiresIn: 300, // 5 minutes
      piiServiceUrl: process.env.PII_SERVICE_URL || 'http://localhost:4000/api/v1',
    };
  }

  /**
   * Update PII data
   */
  async updatePii(
    id: string,
    talentId: string,
    dto: UpdateIndividualPiiDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();

    // Verify access using tenant schema
    const customer = await this.verifyAccess(id, talentId, ProfileType.INDIVIDUAL, context);

    // Check version
    if (customer.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // In production, this would:
    // 1. Get PII access token
    // 2. Call PII service to update data
    // 3. Update search hints in main DB

    // Generate new search hints
    const searchHintName = this.generateSearchHintName(
      dto.pii.givenName,
      dto.pii.familyName,
    );
    const searchHintPhoneLast4 = this.generateSearchHintPhoneLast4(
      dto.pii.phoneNumbers,
    );

    // Log the PII update (pass context for tenant schema)
    await this.techEventLogService.piiAccess(
      TechEventType.PII_ACCESS_REQUESTED,
      'PII data updated for individual customer',
      {
        customerId: id,
        rmProfileId: customer.rmProfileId,
        operatorId: context.userId,
        fieldsUpdated: Object.keys(dto.pii),
      },
      context,
    );

    // Update search hints and record access log in transaction
    await prisma.$transaction(async (tx) => {
      // TODO: Update PII search hints
      // In the current PII design, search hints could be stored:
      // 1. As columns in CustomerProfile table, or
      // 2. In a separate tenant-scoped table
      // For now, we just record the access log and update version
      void searchHintName;
      void searchHintPhoneLast4;

      // Record access log
      await tx.customerAccessLog.create({
        data: {
          customerId: id,
          profileStoreId: customer.profileStoreId,
          talentId,
          action: CustomerAction.PII_UPDATE,
          fieldChanges: { fieldsUpdated: Object.keys(dto.pii) } as Prisma.InputJsonValue,
          operatorId: context.userId,
          operatorName: context.userName,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
      });

      // Update version
      await tx.customerProfile.update({
        where: { id },
        data: {
          lastModifiedTalentId: talentId,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });
    });

    return {
      id,
      searchHintName,
      searchHintPhoneLast4,
      message: 'PII data update submitted',
    };
  }

  /**
   * Verify talent has access to customer and it's an individual profile
   * v0.20: Fixed to use multi-tenant raw SQL query
   */
  private async verifyAccess(
    customerId: string,
    talentId: string,
    expectedType: ProfileType,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Query customer profile using tenant schema with all fields needed for change log
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_type: string;
      profile_store_id: string;
      rm_profile_id: string;
      version: number;
      nickname: string;
      primary_language: string | null;
      status_id: string | null;
      tags: string[];
      notes: string | null;
    }>>(`
      SELECT id, profile_type, profile_store_id, rm_profile_id, version,
             nickname, primary_language, status_id, tags, notes
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

    if (customer.profile_type !== expectedType) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Customer is not an ${expectedType} profile`,
      });
    }

    // Query talent using tenant schema
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string | null;
    }>>(`
      SELECT id, profile_store_id
      FROM "${schema}".talent
      WHERE id = $1::uuid
    `, talentId);

    const talent = talents[0];

    if (!talent || talent.profile_store_id !== customer.profile_store_id) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    // Return customer data with normalized property names
    return {
      id: customer.id,
      profileType: customer.profile_type,
      profileStoreId: customer.profile_store_id,
      rmProfileId: customer.rm_profile_id,
      version: customer.version,
      nickname: customer.nickname,
      primaryLanguage: customer.primary_language,
      statusId: customer.status_id,
      tags: customer.tags,
      notes: customer.notes,
    };
  }

  /**
   * Generate masked name for search
   * Format: "姓 + * + 名最后一字", e.g., "张*三"
   */
  private generateSearchHintName(
    givenName?: string,
    familyName?: string,
  ): string | null {
    if (!familyName && !givenName) return null;

    const family = familyName || '';
    const given = givenName || '';

    if (family && given) {
      return `${family.charAt(0)}*${given.charAt(given.length - 1)}`;
    }
    if (family) {
      return `${family.charAt(0)}*`;
    }
    if (given) {
      return `*${given.charAt(given.length - 1)}`;
    }
    return null;
  }

  /**
   * Generate phone last 4 digits for search
   */
  private generateSearchHintPhoneLast4(
    phoneNumbers?: Array<{ number: string; isPrimary?: boolean }>,
  ): string | null {
    const primary = phoneNumbers?.find((p) => p.isPrimary) || phoneNumbers?.[0];
    if (!primary?.number) return null;

    const cleaned = primary.number.replace(/\D/g, '');
    return cleaned.length >= 4 ? cleaned.slice(-4) : null;
  }
}
