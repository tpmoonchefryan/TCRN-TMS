// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import type { ArtistLifecycleFlow } from '@tcrn/shared';

import { normalizeStoredArtistLifecycleFlow } from '../../settings/domain/settings.policy';
import { TALENT_SELECT_FIELDS, type TalentData } from '../domain/talent-read.policy';
import type { TalentLifecycleStatus } from '../domain/talent-read.policy';

export interface ArtistStageLifecycleCatalogRecord {
  code: string;
  id: string;
  isActive: boolean;
  lifecycleStatusMapping: TalentLifecycleStatus;
}

@Injectable()
export class TalentLifecycleRepository {
  async listArtistStages(
    tenantSchema: string,
  ): Promise<ArtistStageLifecycleCatalogRecord[]> {
    return prisma.$queryRawUnsafe<ArtistStageLifecycleCatalogRecord[]>(
      `SELECT
         id,
         code,
         is_active as "isActive",
         lifecycle_status_mapping as "lifecycleStatusMapping"
       FROM "${tenantSchema}".artist_stage
       WHERE owner_type = 'tenant'
         AND owner_id IS NULL
       ORDER BY sort_order ASC, code ASC`,
    );
  }

  async readArtistLifecycleFlow(
    tenantSchema: string,
  ): Promise<ArtistLifecycleFlow> {
    const tenants = await prisma.$queryRawUnsafe<Array<{
      settings: Record<string, unknown> | null;
    }>>(
      `
        SELECT settings
        FROM public.tenant
        WHERE schema_name = $1
      `,
      tenantSchema,
    );

    return normalizeStoredArtistLifecycleFlow(
      tenants[0]?.settings?.artistLifecycleFlow,
    );
  }

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

  async transitionToStage(
    id: string,
    tenantSchema: string,
    userId: string,
    targetStageId: string,
    lifecycleStatus: TalentLifecycleStatus,
  ): Promise<TalentData> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `UPDATE "${tenantSchema}".talent
       SET
         artist_stage_id = $3::uuid,
         is_active = CASE WHEN $4 = 'published' THEN true ELSE false END,
         lifecycle_status = $4,
         published_at = CASE
           WHEN $4 = 'published' THEN COALESCE(published_at, now())
           ELSE published_at
         END,
         published_by = CASE
           WHEN $4 = 'published' THEN COALESCE(published_by, $2::uuid)
           ELSE published_by
         END,
         updated_at = now(),
         updated_by = $2::uuid,
         version = version + 1
       WHERE id = $1::uuid
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      id,
      userId,
      targetStageId,
      lifecycleStatus,
    );

    return results[0];
  }
}
