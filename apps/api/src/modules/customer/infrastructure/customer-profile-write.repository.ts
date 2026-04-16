// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type { CustomerProfileAccessRecord } from '../domain/customer-profile-write.policy';
import type { CustomerAction } from '../dto/customer.dto';

@Injectable()
export class CustomerProfileWriteRepository {
  async findAccessRecord(
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<CustomerProfileAccessRecord | null> {
    const customers = await prisma.$queryRawUnsafe<CustomerProfileAccessRecord[]>(
      `SELECT
         cp.id,
         cp.profile_store_id as "profileStoreId",
         cp.nickname,
         cp.profile_type as "profileType",
         cp.is_active as "isActive",
         cp.version
       FROM "${tenantSchema}".customer_profile cp
       JOIN "${tenantSchema}".talent t ON t.profile_store_id = cp.profile_store_id
       WHERE cp.id = $1::uuid
         AND t.id = $2::uuid
         AND t.profile_store_id IS NOT NULL`,
      customerId,
      talentId,
    );

    return customers[0] ?? null;
  }

  async findActiveInactivationReasonId(
    tenantSchema: string,
    reasonCode: string,
  ): Promise<string | null> {
    const reasons = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".inactivation_reason
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      reasonCode,
    );

    return reasons[0]?.id ?? null;
  }

  deactivate(
    tenantSchema: string,
    args: {
      customerId: string;
      inactivationReasonId: string | null;
      occurredAt: Date;
      talentId: string;
      userId: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".customer_profile
       SET is_active = false,
           inactivation_reason_id = $2::uuid,
           inactivated_at = $3,
           last_modified_talent_id = $4::uuid,
           updated_by = $5::uuid,
           version = version + 1,
           updated_at = $3
       WHERE id = $1::uuid`,
      args.customerId,
      args.inactivationReasonId,
      args.occurredAt,
      args.talentId,
      args.userId,
    );
  }

  reactivate(
    tenantSchema: string,
    args: {
      customerId: string;
      occurredAt: Date;
      talentId: string;
      userId: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".customer_profile
       SET is_active = true,
           inactivation_reason_id = NULL,
           inactivated_at = NULL,
           last_modified_talent_id = $2::uuid,
           updated_by = $3::uuid,
           version = version + 1,
           updated_at = $4
       WHERE id = $1::uuid`,
      args.customerId,
      args.talentId,
      args.userId,
      args.occurredAt,
    );
  }

  createAccessLog(
    tenantSchema: string,
    args: {
      customerId: string;
      profileStoreId: string;
      talentId: string;
      action: CustomerAction;
      userId: string;
      userName: string;
      ipAddress?: string;
      userAgent?: string;
      requestId: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".customer_access_log (
         id, customer_id, profile_store_id, talent_id, action,
         operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
         $5::uuid, $6, $7::inet, $8, $9, NOW()
       )`,
      args.customerId,
      args.profileStoreId,
      args.talentId,
      args.action,
      args.userId,
      args.userName,
      args.ipAddress ?? '0.0.0.0',
      args.userAgent,
      args.requestId,
    );
  }
}
