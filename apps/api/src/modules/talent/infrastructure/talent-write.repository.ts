// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@tcrn/database';
import type { LocalizedText } from '@tcrn/shared';

import {
  readLocalizedText,
  stringifyLocalizedText,
} from '../../../platform/persistence/localized-text.persistence';
import type { TalentLifecycleStatus } from '../domain/talent-read.policy';
import { TALENT_SELECT_FIELDS, type TalentData } from '../domain/talent-read.policy';
import {
  buildTalentUpdateMutation,
  EMPTY_TALENT_DELETE_DEPENDENCIES,
  hasProtectedTalentDeleteDependencies,
  type TalentCreateInput,
  type TalentDeleteExecutionResult,
  type TalentDeleteProtectedDependencyCounts,
  type TalentUpdateInput,
} from '../domain/talent-write.policy';

type TalentRawData = Omit<TalentData, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type TalentUpdatePersistenceInput = Omit<TalentUpdateInput, 'name' | 'description'> & {
  name?: LocalizedText;
  description?: LocalizedText;
};

const mapTalentData = (row: TalentRawData): TalentData => ({
  ...row,
  name: readLocalizedText(row.name, 'talent.name'),
  description: readLocalizedText(row.description, 'talent.description'),
});

@Injectable()
export class TalentWriteRepository {
  async findActiveArtistStage(
    tenantSchema: string,
    artistStageId: string,
  ): Promise<{
    code: string;
    id: string;
    lifecycleStatusMapping: TalentLifecycleStatus;
  } | null> {
    const stages = await prisma.$queryRawUnsafe<Array<{
      code: string;
      id: string;
      lifecycleStatusMapping: TalentLifecycleStatus;
    }>>(
      `SELECT
         id,
         code,
         lifecycle_status_mapping as "lifecycleStatusMapping"
       FROM "${tenantSchema}".artist_stage
       WHERE id = $1::uuid
         AND owner_type = 'tenant'
         AND owner_id IS NULL
         AND is_active = true`,
      artistStageId,
    );

    return stages[0] ?? null;
  }

  async hasActiveProfileStore(
    tenantSchema: string,
    profileStoreId: string,
  ): Promise<boolean> {
    const profileStore = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".profile_store
       WHERE id = $1::uuid AND is_active = true`,
      profileStoreId,
    );

    return profileStore.length > 0;
  }

  async findSubsidiaryPath(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<string | null> {
    const subsidiary = await prisma.$queryRawUnsafe<Array<{ path: string }>>(
      `SELECT path
       FROM "${tenantSchema}".subsidiary
       WHERE id = $1::uuid`,
      subsidiaryId,
    );

    return subsidiary[0]?.path ?? null;
  }

  async create(
    tenantSchema: string,
    data: TalentCreateInput & {
      extraData?: Record<string, unknown> | null;
      lifecycleStatus: TalentLifecycleStatus;
      path: string;
      settings: Record<string, unknown>;
    },
    userId: string,
  ): Promise<TalentData> {
    const results = await prisma.$queryRawUnsafe<TalentRawData[]>(
      `INSERT INTO "${tenantSchema}".talent
        (id, subsidiary_id, profile_store_id, artist_stage_id, code, path, name, extra_data, display_name,
         description, avatar_url, homepage_path, timezone,
         is_active, lifecycle_status, published_at, published_by, settings,
         created_at, updated_at, created_by, updated_by, version)
       VALUES
        (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb, $7::jsonb, $8, $9::jsonb, $10, $11, $12,
         $13, $14, CASE WHEN $14 = 'published' THEN now() ELSE NULL END, CASE WHEN $14 = 'published' THEN $15::uuid ELSE NULL END, $16::jsonb, now(), now(), $15::uuid, $15::uuid, 1)
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      data.subsidiaryId || null,
      data.profileStoreId,
      data.artistStageId,
      data.code,
      data.path,
      stringifyLocalizedText(data.name),
      data.extraData ? JSON.stringify(data.extraData) : null,
      data.displayName,
      stringifyLocalizedText(data.description as LocalizedText),
      data.avatarUrl || null,
      data.homepagePath || null,
      data.timezone || 'UTC',
      data.lifecycleStatus === 'published',
      data.lifecycleStatus,
      userId,
      JSON.stringify(data.settings),
    );

    return mapTalentData(results[0]);
  }

  async update(
    id: string,
    tenantSchema: string,
    data: TalentUpdatePersistenceInput,
    userId: string,
  ): Promise<TalentData> {
    const mutation = buildTalentUpdateMutation(data, userId);
    const results = await prisma.$queryRawUnsafe<TalentRawData[]>(
      `UPDATE "${tenantSchema}".talent
       SET ${mutation.updates.join(', ')}
       WHERE id = $1::uuid
       RETURNING
         ${TALENT_SELECT_FIELDS}`,
      id,
      ...mutation.params,
    );

    return mapTalentData(results[0]);
  }

  async deleteDraftTalent(
    tenantSchema: string,
    talentId: string,
    expectedVersion: number,
  ): Promise<TalentDeleteExecutionResult> {
    return prisma.$transaction(async (tx) => {
      const currentRows = await tx.$queryRawUnsafe<
        Array<{ version: number; lifecycleStatus: TalentLifecycleStatus }>
      >(
        `SELECT
           version,
           lifecycle_status as "lifecycleStatus"
         FROM "${tenantSchema}".talent
         WHERE id = $1::uuid
         FOR UPDATE`,
        talentId,
      );
      const current = currentRows[0];

      if (!current) {
        return { outcome: 'not_found' };
      }

      if (current.version !== expectedVersion) {
        return {
          outcome: 'version_mismatch',
          currentVersion: current.version,
        };
      }

      if (current.lifecycleStatus !== 'draft') {
        return {
          outcome: 'lifecycle_conflict',
          lifecycleStatus: current.lifecycleStatus,
        };
      }

      const dependencyRows = await tx.$queryRawUnsafe<
        TalentDeleteProtectedDependencyCounts[]
      >(
        `SELECT
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".customer_profile
            WHERE talent_id = $1::uuid) as "customerProfiles",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".customer_access_log
            WHERE talent_id = $1::uuid) as "customerAccessLogs",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".import_job
            WHERE talent_id = $1::uuid) as "importJobs",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".export_job
            WHERE talent_id = $1::uuid) as "exportJobs",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".marshmallow_export_job
            WHERE talent_id = $1::uuid) as "marshmallowExportJobs",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".report_job
            WHERE talent_id = $1::uuid) as "reportJobs",
           (SELECT COUNT(*)::int
            FROM "${tenantSchema}".marshmallow_message
            WHERE talent_id = $1::uuid) as "marshmallowMessages"`,
        talentId,
      );
      const dependencies =
        dependencyRows[0] ?? EMPTY_TALENT_DELETE_DEPENDENCIES;

      if (hasProtectedTalentDeleteDependencies(dependencies)) {
        return {
          outcome: 'protected_dependency',
          dependencies,
        };
      }

      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".config_override
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".external_blocklist_pattern
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".blocklist_entry
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".consent
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".membership_level
         WHERE membership_type_id IN (
           SELECT membership_type.id
           FROM "${tenantSchema}".membership_type
           INNER JOIN "${tenantSchema}".membership_class
             ON membership_class.id = membership_type.membership_class_id
           WHERE membership_class.owner_type = 'talent'
             AND membership_class.owner_id = $1::uuid
         )`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".membership_type
         WHERE membership_class_id IN (
           SELECT id
           FROM "${tenantSchema}".membership_class
           WHERE owner_type = 'talent'
             AND owner_id = $1::uuid
         )`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".membership_class
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".inactivation_reason
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".reason_category
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".communication_type
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".channel_category
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".business_segment
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".address_type
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".customer_status
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".integration_adapter
         WHERE owner_type = 'talent' AND owner_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".marshmallow_config
         WHERE talent_id = $1::uuid`,
        talentId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "${tenantSchema}".talent_homepage
         WHERE talent_id = $1::uuid`,
        talentId,
      );

      const deletedRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `DELETE FROM "${tenantSchema}".talent
         WHERE id = $1::uuid
         RETURNING id`,
        talentId,
      );

      if (!deletedRows[0]) {
        return { outcome: 'not_found' };
      }

      return {
        outcome: 'deleted',
        id: deletedRows[0].id,
      };
    });
  }
}
