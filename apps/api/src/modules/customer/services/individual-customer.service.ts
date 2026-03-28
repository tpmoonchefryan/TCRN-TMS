// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext,TechEventType } from '@tcrn/shared';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import { PiiClientService, PiiJwtService } from '../../pii';
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
    private readonly piiClientService: PiiClientService,
    private readonly piiJwtService: PiiJwtService,
  ) {}

  /**
   * Create individual customer profile
   */
  async create(dto: CreateIndividualCustomerDto, context: RequestContext) {
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

    // Generate rm_profile_id for PII link
    const rmProfileId = uuidv4();
    const piiRuntime = dto.pii
      ? await this.resolveEnabledPiiRuntime(talent.profileStoreId, context)
      : null;

    // Generate search hints from PII data
    const searchHintName = this.generateSearchHintName(
      dto.pii?.givenName,
      dto.pii?.familyName,
    );
    const searchHintPhoneLast4 = this.generateSearchHintPhoneLast4(
      dto.pii?.phoneNumbers,
    );

    let piiWriteToken: string | null = null;
    if (dto.pii && piiRuntime) {
      const issuedToken = await this.piiJwtService.issueAccessToken({
        userId: context.userId,
        tenantId: context.tenantId,
        tenantSchema: context.tenantSchema,
        rmProfileId,
        profileStoreId: talent.profileStoreId,
        actions: ['write'],
      });
      piiWriteToken = issuedToken.token;

      await this.piiClientService.createProfile(
        piiRuntime.apiUrl,
        {
          id: rmProfileId,
          profileStoreId: talent.profileStoreId,
          ...dto.pii,
        },
        piiWriteToken,
        context.tenantId,
        context.tenantSchema,
      );
    }

    let customer: {
      id: string;
      nickname: string;
      createdAt: Date;
    };

    try {
      customer = await prisma.$transaction(async (tx) => {
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
          ProfileType.INDIVIDUAL,
          dto.nickname,
          dto.primaryLanguage ?? null,
          statusId,
          dto.tags || [],
          dto.source ?? null,
          dto.notes ?? null,
          context.userId,
        );

        const newCustomer = insertedCustomers[0];

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
            profileType: ProfileType.INDIVIDUAL,
            nickname: dto.nickname,
            primaryLanguage: dto.primaryLanguage,
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
    } catch (error) {
      if (dto.pii && piiRuntime && piiWriteToken) {
        await this.piiClientService.deleteProfile(
          piiRuntime.apiUrl,
          rmProfileId,
          piiWriteToken,
          context.tenantId,
          context.tenantSchema,
        ).catch(async (compensationError) => {
          await this.techEventLogService.warn(
            'PII_PROFILE_COMPENSATION_FAILED',
            'Failed to delete remote PII profile after customer creation transaction failure',
            {
              rmProfileId,
              profileStoreId: talent.profileStoreId,
              operatorId: context.userId,
              originalError: error instanceof Error ? error.message : String(error),
              compensationError: compensationError instanceof Error
                ? compensationError.message
                : String(compensationError),
            },
            context,
          );
        });
      }

      throw error;
    }

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
    const schema = context.tenantSchema;

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
        const statuses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id
          FROM "${schema}".customer_status
          WHERE code = $1 AND is_active = true
          LIMIT 1
        `, dto.statusCode);
        statusId = statuses[0]?.id ?? undefined;
      } else {
        statusId = undefined;
      }
    }

    const updateSetParts: string[] = [
      'last_modified_talent_id = $1::uuid',
      'updated_by = $2::uuid',
      'updated_at = NOW()',
      'version = version + 1',
    ];
    const updateParams: (string | string[] | null)[] = [talentId, context.userId];
    let paramIndex = 3;

    if (dto.nickname !== undefined) {
      updateSetParts.push(`nickname = $${paramIndex++}`);
      updateParams.push(dto.nickname);
    }
    if (dto.primaryLanguage !== undefined) {
      updateSetParts.push(`primary_language = $${paramIndex++}`);
      updateParams.push(dto.primaryLanguage);
    }
    if (statusId !== undefined) {
      updateSetParts.push(`status_id = $${paramIndex++}::uuid`);
      updateParams.push(statusId ?? null);
    }
    if (dto.tags !== undefined) {
      updateSetParts.push(`tags = $${paramIndex++}::text[]`);
      updateParams.push(dto.tags);
    }
    if (dto.notes !== undefined) {
      updateSetParts.push(`notes = $${paramIndex++}`);
      updateParams.push(dto.notes ?? null);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRows = await tx.$queryRawUnsafe<Array<{
        id: string;
        nickname: string;
        version: number;
        updatedAt: Date;
      }>>(`
        UPDATE "${schema}".customer_profile
        SET ${updateSetParts.join(', ')}
        WHERE id = $${paramIndex}::uuid
        RETURNING id, nickname, version, updated_at as "updatedAt"
      `, ...updateParams, id);

      const result = updatedRows[0];

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
          primaryLanguage: dto.primaryLanguage ?? customer.primaryLanguage,
          statusId: statusId ?? customer.statusId,
          tags: dto.tags ?? customer.tags,
          notes: dto.notes ?? customer.notes,
        },
      }, context);

      // Record access log
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schema}".customer_access_log (
          id, customer_id, profile_store_id, talent_id, action,
          field_changes, operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
          $5::jsonb, $6::uuid, $7, $8::inet, $9, $10, NOW()
        )
      `,
        id,
        customer.profileStoreId,
        talentId,
        CustomerAction.UPDATE,
        JSON.stringify(dto),
        context.userId,
        context.userName,
        context.ipAddress || '0.0.0.0',
        context.userAgent,
        context.requestId,
      );

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
    const piiRuntime = await this.resolveEnabledPiiRuntime(customer.profileStoreId, context);
    const accessToken = await this.piiJwtService.issueAccessToken({
      userId: context.userId,
      tenantId: context.tenantId,
      tenantSchema: context.tenantSchema,
      rmProfileId: customer.rmProfileId,
      profileStoreId: customer.profileStoreId,
      actions: ['read'],
    });

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

    return {
      accessToken: accessToken.token,
      piiProfileId: customer.rmProfileId,
      expiresIn: accessToken.expiresIn,
      piiServiceUrl: piiRuntime.piiServiceUrl,
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
    const schema = context.tenantSchema;

    // Verify access using tenant schema
    const customer = await this.verifyAccess(id, talentId, ProfileType.INDIVIDUAL, context);
    const piiRuntime = await this.resolveEnabledPiiRuntime(customer.profileStoreId, context);

    // Check version
    if (customer.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    const accessToken = await this.piiJwtService.issueAccessToken({
      userId: context.userId,
      tenantId: context.tenantId,
      tenantSchema: context.tenantSchema,
      rmProfileId: customer.rmProfileId,
      profileStoreId: customer.profileStoreId,
      actions: ['write'],
    });

    await this.piiClientService.updateProfile(
      piiRuntime.apiUrl,
      customer.rmProfileId,
      dto.pii,
      accessToken.token,
      context.tenantId,
      context.tenantSchema,
    );

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
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schema}".customer_access_log (
          id, customer_id, profile_store_id, talent_id, action,
          field_changes, operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
          $5::jsonb, $6::uuid, $7, $8::inet, $9, $10, NOW()
        )
      `,
        id,
        customer.profileStoreId,
        talentId,
        CustomerAction.PII_UPDATE,
        JSON.stringify({ fieldsUpdated: Object.keys(dto.pii) }),
        context.userId,
        context.userName,
        context.ipAddress || '0.0.0.0',
        context.userAgent,
        context.requestId,
      );

      // Update version
      await tx.$executeRawUnsafe(`
        UPDATE "${schema}".customer_profile
        SET last_modified_talent_id = $2::uuid,
            updated_by = $3::uuid,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1::uuid
      `, id, talentId, context.userId);
    });

    return {
      id,
      searchHintName,
      searchHintPhoneLast4,
      message: 'PII data updated',
    };
  }

  private async resolveEnabledPiiRuntime(
    profileStoreId: string,
    context: RequestContext,
  ): Promise<{
    apiUrl: string;
    piiServiceUrl: string;
  }> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const stores = await prisma.$queryRawUnsafe<Array<{
      piiProxyUrl: string | null;
      piiApiUrl: string | null;
      piiConfigIsActive: boolean | null;
    }>>(`
      SELECT
        ps.pii_proxy_url as "piiProxyUrl",
        psc.api_url as "piiApiUrl",
        psc.is_active as "piiConfigIsActive"
      FROM "${schema}".profile_store ps
      LEFT JOIN "${schema}".pii_service_config psc ON psc.id = ps.pii_service_config_id
      WHERE ps.id = $1::uuid
        AND ps.is_active = true
      LIMIT 1
    `, profileStoreId);

    const store = stores[0];
    const apiUrl = this.normalizeUrl(store?.piiApiUrl);
    const piiServiceUrl = this.normalizeUrl(store?.piiProxyUrl) ?? apiUrl;

    if (!store?.piiConfigIsActive || !apiUrl || !piiServiceUrl) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'PII is not enabled for this profile store',
      });
    }

    return {
      apiUrl,
      piiServiceUrl,
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

  private normalizeUrl(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.replace(/\/+$/, '');
  }
}
