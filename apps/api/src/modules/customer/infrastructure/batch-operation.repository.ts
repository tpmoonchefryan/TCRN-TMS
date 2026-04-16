// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

@Injectable()
export class BatchOperationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async deactivateCustomer(
    tenantSchema: string,
    customerId: string,
    userId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".customer_profile
        SET is_active = false,
            updated_at = NOW(),
            last_modified_by = $2::uuid
        WHERE id = $1::uuid
      `,
      customerId,
      userId,
    );
  }

  async reactivateCustomer(
    tenantSchema: string,
    customerId: string,
    userId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".customer_profile
        SET is_active = true,
            updated_at = NOW(),
            last_modified_by = $2::uuid
        WHERE id = $1::uuid
      `,
      customerId,
      userId,
    );
  }

  async getCustomerTags(
    tenantSchema: string,
    customerId: string,
  ): Promise<string[] | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ tags: string[] | null }>>(
      `
        SELECT tags
        FROM "${tenantSchema}".customer_profile
        WHERE id = $1::uuid
      `,
      customerId,
    );

    return result[0]?.tags ?? (result.length > 0 ? [] : null);
  }

  async updateCustomerTags(
    tenantSchema: string,
    customerId: string,
    tags: string[],
    userId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".customer_profile
        SET tags = $2::text[],
            updated_at = NOW(),
            last_modified_by = $3::uuid
        WHERE id = $1::uuid
      `,
      customerId,
      tags,
      userId,
    );
  }

  async findActiveMembershipId(
    tenantSchema: string,
    customerId: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const membership = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${tenantSchema}".membership_record
        WHERE customer_profile_id = $1::uuid
          AND status = 'active'
        LIMIT 1
      `,
      customerId,
    );

    return membership[0]?.id ?? null;
  }

  async findMembershipClassIdByCode(
    tenantSchema: string,
    membershipClassCode: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const membershipClass = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${tenantSchema}".membership_class
        WHERE code = $1
      `,
      membershipClassCode,
    );

    return membershipClass[0]?.id ?? null;
  }

  async createMembershipRecord(
    tenantSchema: string,
    customerId: string,
    membershipClassId: string,
    validFrom?: string,
    validTo?: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".membership_record (
          id,
          customer_profile_id,
          membership_class_id,
          status,
          valid_from,
          valid_to,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          'active',
          COALESCE($3::timestamptz, NOW()),
          $4::timestamptz,
          NOW(),
          NOW()
        )
      `,
      customerId,
      membershipClassId,
      validFrom,
      validTo,
    );
  }

  async updateMembershipRecordValidity(
    tenantSchema: string,
    membershipId: string,
    updates: { validFrom?: string; validTo?: string },
  ): Promise<void> {
    const clauses: string[] = [];
    const params: unknown[] = [membershipId];
    let paramIndex = 2;

    if (updates.validFrom) {
      clauses.push(`valid_from = $${paramIndex}::timestamptz`);
      params.push(updates.validFrom);
      paramIndex += 1;
    }

    if (updates.validTo) {
      clauses.push(`valid_to = $${paramIndex}::timestamptz`);
      params.push(updates.validTo);
      paramIndex += 1;
    }

    if (clauses.length === 0) {
      return;
    }

    clauses.push('updated_at = NOW()');

    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".membership_record
        SET ${clauses.join(', ')}
        WHERE id = $1::uuid
      `,
      ...params,
    );
  }
}
