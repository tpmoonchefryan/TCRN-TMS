// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  CustomerArchiveAccessRecord,
  TalentArchiveBindingRecord,
} from '../domain/customer-archive.policy';

@Injectable()
export class CustomerArchiveRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findTalentArchiveBinding(
    tenantSchema: string,
    talentId: string,
  ): Promise<TalentArchiveBindingRecord | null> {
    const rows = await this.databaseService.getPrisma().$queryRawUnsafe<
      TalentArchiveBindingRecord[]
    >(
      `SELECT
         t.id,
         t.profile_store_id as "profileStoreId",
         ps.is_active as "profileStoreIsActive"
       FROM "${tenantSchema}".talent t
       LEFT JOIN "${tenantSchema}".profile_store ps
         ON ps.id = t.profile_store_id
       WHERE t.id = $1::uuid`,
      talentId,
    );

    return rows[0] ?? null;
  }

  async findCustomerArchiveAccess(
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<CustomerArchiveAccessRecord | null> {
    const rows = await this.databaseService.getPrisma().$queryRawUnsafe<
      CustomerArchiveAccessRecord[]
    >(
      `SELECT
         cp.id,
         cp.profile_type as "profileType",
         cp.profile_store_id as "profileStoreId",
         cp.nickname,
         cp.version,
         cp.is_active as "isActive",
         cp.primary_language as "primaryLanguage",
         cp.status_id as "statusId",
         cp.tags,
         cp.notes
       FROM "${tenantSchema}".customer_profile cp
       JOIN "${tenantSchema}".talent t
         ON t.profile_store_id = cp.profile_store_id
       WHERE cp.id = $1::uuid
         AND t.id = $2::uuid
         AND t.profile_store_id IS NOT NULL`,
      customerId,
      talentId,
    );

    return rows[0] ?? null;
  }
}
