// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  MembershipRenewalCandidate,
  UpcomingExpirationRecord,
} from '../domain/membership-scheduler.policy';

@Injectable()
export class MembershipSchedulerRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getActiveTenantSchemas(): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(
      `
        SELECT schema_name as "schemaName"
        FROM public.tenant
        WHERE is_active = true
      `,
    );

    return tenants.map((tenant) => tenant.schemaName);
  }

  async findMembershipsToAutoRenew(
    tenantSchema: string,
    now: Date,
  ): Promise<MembershipRenewalCandidate[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<MembershipRenewalCandidate[]>(
      `
        SELECT
          mr.id,
          mr.valid_to as "validTo",
          mt.default_renewal_days as "defaultRenewalDays"
        FROM "${tenantSchema}".membership_record mr
        JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
        JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
        WHERE mr.valid_to < $1::timestamptz
          AND mr.is_expired = false
          AND mr.auto_renew = true
        LIMIT 100
      `,
      now,
    );
  }

  async renewMembershipValidity(
    tenantSchema: string,
    membershipId: string,
    newValidTo: Date,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".membership_record
        SET valid_to = $1::timestamptz, updated_at = NOW()
        WHERE id = $2::uuid
      `,
      newValidTo,
      membershipId,
    );
  }

  async insertAutoRenewChangeLog(
    tenantSchema: string,
    membershipId: string,
    diffJson: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".change_log (
          id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(),
          'update',
          'membership_record',
          $1::uuid,
          'Membership auto-renewal',
          $2::jsonb,
          NULL,
          '0.0.0.0'::inet,
          NOW()
        )
      `,
      membershipId,
      diffJson,
    );
  }

  async expireMemberships(tenantSchema: string, now: Date): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".membership_record
        SET is_expired = true, expired_at = $1::timestamptz, updated_at = NOW()
        WHERE valid_to < $1::timestamptz
          AND is_expired = false
          AND auto_renew = false
      `,
      now,
    );

    return Number(result);
  }

  async findExpiredMembershipIds(
    tenantSchema: string,
    now: Date,
  ): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const records = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${tenantSchema}".membership_record
        WHERE expired_at = $1::timestamptz
          AND is_expired = true
        LIMIT 100
      `,
      now,
    );

    return records.map((record) => record.id);
  }

  async insertExpirationChangeLog(
    tenantSchema: string,
    membershipId: string,
    diffJson: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".change_log (
          id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(),
          'update',
          'membership_record',
          $1::uuid,
          'Membership expired',
          $2::jsonb,
          NULL,
          '0.0.0.0'::inet,
          NOW()
        )
      `,
      membershipId,
      diffJson,
    );
  }

  async getUpcomingExpirations(
    tenantSchema: string,
    now: Date,
    futureDate: Date,
  ): Promise<UpcomingExpirationRecord[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<UpcomingExpirationRecord[]>(
      `
        SELECT
          mr.customer_id as "customerId",
          ml.name_en as "membershipLevelName",
          mr.valid_to as "expiresAt"
        FROM "${tenantSchema}".membership_record mr
        JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
        WHERE mr.valid_to >= $1::timestamptz
          AND mr.valid_to <= $2::timestamptz
          AND mr.is_expired = false
          AND mr.auto_renew = false
      `,
      now,
      futureDate,
    );
  }
}
