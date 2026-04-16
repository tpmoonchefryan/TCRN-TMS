// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import { TALENT_SELECT_FIELDS, type TalentData } from '../domain/talent-read.policy';

@Injectable()
export class TalentLifecycleRepository {
  async hasActiveProfileStore(
    profileStoreId: string,
    tenantSchema: string,
  ): Promise<boolean> {
    const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".profile_store
       WHERE id = $1::uuid
         AND is_active = true`,
      profileStoreId,
    );

    return results.length > 0;
  }

  async publish(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<TalentData> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `UPDATE "${tenantSchema}".talent
       SET
         is_active = true,
         lifecycle_status = 'published',
         published_at = COALESCE(published_at, now()),
         published_by = COALESCE(published_by, $2::uuid),
         updated_at = now(),
         updated_by = $2::uuid,
         version = version + 1
       WHERE id = $1::uuid
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      id,
      userId,
    );

    return results[0];
  }

  async disable(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<TalentData> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `UPDATE "${tenantSchema}".talent
       SET
         is_active = false,
         lifecycle_status = 'disabled',
         updated_at = now(),
         updated_by = $2::uuid,
         version = version + 1
       WHERE id = $1::uuid
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      id,
      userId,
    );

    return results[0];
  }

  async reEnable(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<TalentData> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `UPDATE "${tenantSchema}".talent
       SET
         is_active = true,
         lifecycle_status = 'published',
         updated_at = now(),
         updated_by = $2::uuid,
         version = version + 1
       WHERE id = $1::uuid
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      id,
      userId,
    );

    return results[0];
  }
}
