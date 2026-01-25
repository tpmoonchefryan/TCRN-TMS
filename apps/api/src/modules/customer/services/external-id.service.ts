// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';

/**
 * Customer External ID Service
 * Manages external system identifiers for customers
 */
@Injectable()
export class CustomerExternalIdService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Get external IDs for a customer (multi-tenant aware)
   */
  async findByCustomer(customerId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Query using raw SQL
    const externalIds = await prisma.$queryRawUnsafe<Array<{
      id: string;
      consumer_id: string;
      consumer_code: string;
      consumer_name: string;
      external_id: string;
      created_at: Date;
      created_by: string | null;
    }>>(`
      SELECT 
        cei.id,
        c.id as consumer_id,
        c.code as consumer_code,
        c.name_en as consumer_name,
        cei.external_id,
        cei.created_at,
        cei.created_by
      FROM "${schema}".customer_external_id cei
      JOIN "${schema}".consumer c ON c.id = cei.consumer_id
      WHERE cei.customer_id = $1::uuid
      ORDER BY cei.created_at DESC
    `, customerId);

    return externalIds.map((item) => ({
      id: item.id,
      consumer: {
        id: item.consumer_id,
        code: item.consumer_code,
        name: item.consumer_name,
      },
      externalId: item.external_id,
      createdAt: item.created_at,
      createdBy: item.created_by,
    }));
  }

  /**
   * Add external ID to customer (multi-tenant aware)
   */
  async create(
    customerId: string,
    talentId: string,
    dto: { consumerCode: string; externalId: string },
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access
    const customer = await this.verifyCustomerAccess(customerId, talentId, context);

    // Get consumer using raw SQL
    const consumers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      name_en: string;
    }>>(`
      SELECT id, code, name_en
      FROM "${schema}".consumer
      WHERE code = $1 AND is_active = true
    `, dto.consumerCode);

    if (!consumers.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      });
    }
    const consumer = consumers[0];

    // Check for duplicate using raw SQL
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".customer_external_id
      WHERE profile_store_id = $1::uuid AND consumer_id = $2::uuid AND external_id = $3
    `, customer.profileStoreId, consumer.id, dto.externalId);

    if (existing.length) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `External ID '${dto.externalId}' already exists for consumer '${dto.consumerCode}'`,
      });
    }

    // Create using raw SQL
    const newExternalIds = await prisma.$queryRawUnsafe<Array<{
      id: string;
      external_id: string;
      created_at: Date;
    }>>(`
      INSERT INTO "${schema}".customer_external_id (
        id, customer_id, profile_store_id, consumer_id, external_id, created_by, created_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, NOW()
      )
      RETURNING id, external_id, created_at
    `,
      customerId,
      customer.profileStoreId,
      consumer.id,
      dto.externalId,
      context.userId,
    );

    const newExternalId = newExternalIds[0];

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'create', 'customer_external_id', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      newExternalId.id,
      `${consumer.code}:${dto.externalId}`,
      JSON.stringify({
        new: {
          consumerCode: consumer.code,
          externalId: dto.externalId,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      id: newExternalId.id,
      consumer: {
        id: consumer.id,
        code: consumer.code,
        name: consumer.name_en,
      },
      externalId: newExternalId.external_id,
      createdAt: newExternalId.created_at,
    };
  }

  /**
   * Delete external ID (multi-tenant aware)
   */
  async delete(
    customerId: string,
    externalIdId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Get external ID using raw SQL
    const externalIds = await prisma.$queryRawUnsafe<Array<{
      id: string;
      external_id: string;
      consumer_code: string;
    }>>(`
      SELECT cei.id, cei.external_id, c.code as consumer_code
      FROM "${schema}".customer_external_id cei
      JOIN "${schema}".consumer c ON c.id = cei.consumer_id
      WHERE cei.id = $1::uuid AND cei.customer_id = $2::uuid
    `, externalIdId, customerId);

    if (!externalIds.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External ID not found',
      });
    }
    const externalId = externalIds[0];

    // Delete using raw SQL
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${schema}".customer_external_id WHERE id = $1::uuid
    `, externalIdId);

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'delete', 'customer_external_id', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      externalIdId,
      `${externalId.consumer_code}:${externalId.external_id}`,
      JSON.stringify({
        old: {
          consumerCode: externalId.consumer_code,
          externalId: externalId.external_id,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );
  }

  /**
   * Find customer by external ID (multi-tenant aware)
   */
  async findCustomerByExternalId(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const records = await prisma.$queryRawUnsafe<Array<{
      id: string;
      nickname: string;
      profile_store_id: string;
    }>>(`
      SELECT cp.id, cp.nickname, cp.profile_store_id
      FROM "${schema}".customer_external_id cei
      JOIN "${schema}".consumer c ON c.id = cei.consumer_id
      JOIN "${schema}".customer_profile cp ON cp.id = cei.customer_id
      WHERE cei.profile_store_id = $1::uuid AND c.code = $2 AND cei.external_id = $3
    `, profileStoreId, consumerCode, externalId);

    return records[0] ?? null;
  }

  /**
   * Check if external ID exists in profile store (multi-tenant aware)
   */
  async existsInProfileStore(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ): Promise<boolean> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${schema}".customer_external_id cei
      JOIN "${schema}".consumer c ON c.id = cei.consumer_id
      WHERE cei.profile_store_id = $1::uuid AND c.code = $2 AND cei.external_id = $3
    `, profileStoreId, consumerCode, externalId);

    return Number(countResult[0]?.count || 0) > 0;
  }

  /**
   * Verify talent has access to customer (multi-tenant aware)
   */
  private async verifyCustomerAccess(customerId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Find customer using raw SQL
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string;
      nickname: string;
    }>>(`
      SELECT id, profile_store_id, nickname
      FROM "${schema}".customer_profile
      WHERE id = $1::uuid
    `, customerId);

    if (!customers.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }
    const customer = customers[0];

    // Find talent using raw SQL
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

    return {
      id: customer.id,
      profileStoreId: customer.profile_store_id,
      nickname: customer.nickname,
    };
  }
}
