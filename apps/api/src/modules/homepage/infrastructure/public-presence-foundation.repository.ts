// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';

import {
  PublicPresenceAssetRevisionPinSchema,
  PublicPresenceAssetSnapshotSchema,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceAssetSnapshot,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';
import type {
  CreatePublicPresenceDocumentFromSourceInput,
  CreatePublicPresencePortalInput,
  PersistPublicPresenceDraftVersionInput,
  PersistPublicPresenceValidationSnapshotInput,
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
  PublicPresenceScheduledVersionRecord,
  PublicPresenceValidationSnapshotRecord,
  PublicPresenceWorkflowEventRecord,
  UpdatePublicPresenceDocumentWorkflowStateInput,
} from '../domain/public-presence-foundation.policy';

interface TemplateAssetPinRow {
  templateAssetId: string | null;
  templateAssetRevisionId: string | null;
  templateAssetSourceHash: string | null;
  templateAssetSnapshot: Record<string, unknown> | null;
}

type DocumentVersionRow = Omit<PublicPresenceDocumentVersionRecord, 'templateAssetPin'> &
  TemplateAssetPinRow;

function parseTemplateAssetPin(row: TemplateAssetPinRow): PublicPresenceAssetRevisionPin | null {
  if (!row.templateAssetId || !row.templateAssetRevisionId || !row.templateAssetSourceHash) {
    return null;
  }

  const snapshot: PublicPresenceAssetSnapshot | null = row.templateAssetSnapshot
    ? (PublicPresenceAssetSnapshotSchema.parse(
        row.templateAssetSnapshot
      ) as PublicPresenceAssetSnapshot)
    : null;

  return PublicPresenceAssetRevisionPinSchema.parse({
    assetId: row.templateAssetId,
    assetRevisionId: row.templateAssetRevisionId,
    snapshot,
    sourceHash: row.templateAssetSourceHash,
  }) as PublicPresenceAssetRevisionPin;
}

function toDocumentVersionRecord(
  row: DocumentVersionRow | null | undefined
): PublicPresenceDocumentVersionRecord | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    templateAssetPin: parseTemplateAssetPin(row),
  };
}

@Injectable()
export class PublicPresenceFoundationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findPortalByTalentId(
    schema: string,
    talentId: string
  ): Promise<PublicPresencePortalRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const portals = await prisma.$queryRawUnsafe<PublicPresencePortalRecord[]>(
      `
        SELECT
          id,
          talent_id as "talentId",
          draft_version_id as "draftVersionId",
          live_version_id as "liveVersionId",
          latest_version_number as "latestVersionNumber",
          latest_validation_state as "latestValidationState",
          last_validated_at as "lastValidatedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${schema}".public_presence_portal
        WHERE talent_id = $1::uuid
      `,
      talentId
    );

    return portals[0] ?? null;
  }

  async createPortal(
    schema: string,
    input: CreatePublicPresencePortalInput
  ): Promise<PublicPresencePortalRecord> {
    const prisma = this.databaseService.getPrisma();
    const created = await prisma.$queryRawUnsafe<PublicPresencePortalRecord[]>(
      `
        INSERT INTO "${schema}".public_presence_portal
          (
            id,
            talent_id,
            latest_version_number,
            created_at,
            updated_at,
            created_by,
            updated_by,
            version
          )
        VALUES
          (gen_random_uuid(), $1::uuid, 0, now(), now(), $2::uuid, $2::uuid, 1)
        RETURNING
          id,
          talent_id as "talentId",
          draft_version_id as "draftVersionId",
          live_version_id as "liveVersionId",
          latest_version_number as "latestVersionNumber",
          latest_validation_state as "latestValidationState",
          last_validated_at as "lastValidatedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      input.talentId,
      input.actorId
    );

    return created[0];
  }

  async findDraftVersion(
    schema: string,
    portalId: string
  ): Promise<PublicPresenceDocumentVersionRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        SELECT
          v.id,
          v.portal_id as "portalId",
          v.version_number as "versionNumber",
          v.document_schema_version as "documentSchemaVersion",
          v.template_id as "templateId",
          v.template_asset_id as "templateAssetId",
          v.template_asset_revision_id as "templateAssetRevisionId",
          v.template_asset_source_hash as "templateAssetSourceHash",
          v.template_asset_snapshot as "templateAssetSnapshot",
          v.document,
          v.document_state as "documentState",
          v.content_hash_algorithm as "contentHashAlgorithm",
          v.content_hash as "contentHash",
          v.last_validation_snapshot_id as "lastValidationSnapshotId",
          v.scheduled_for as "scheduledFor",
          v.published_at as "publishedAt",
          v.published_by as "publishedBy",
          v.created_at as "createdAt",
          v.updated_at as "updatedAt",
          v.created_by as "createdBy"
        FROM "${schema}".public_presence_portal p
        JOIN "${schema}".public_presence_document_version v
          ON v.id = p.draft_version_id
        WHERE p.id = $1::uuid
      `,
      portalId
    );

    return toDocumentVersionRecord(versions[0]);
  }

  async findLatestVersionByTemplate(
    schema: string,
    portalId: string,
    templateId: string,
    states?: string[]
  ): Promise<PublicPresenceDocumentVersionRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        SELECT
          id,
          portal_id as "portalId",
          version_number as "versionNumber",
          document_schema_version as "documentSchemaVersion",
          template_id as "templateId",
          template_asset_id as "templateAssetId",
          template_asset_revision_id as "templateAssetRevisionId",
          template_asset_source_hash as "templateAssetSourceHash",
          template_asset_snapshot as "templateAssetSnapshot",
          document,
          document_state as "documentState",
          content_hash_algorithm as "contentHashAlgorithm",
          content_hash as "contentHash",
          last_validation_snapshot_id as "lastValidationSnapshotId",
          scheduled_for as "scheduledFor",
          published_at as "publishedAt",
          published_by as "publishedBy",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy"
        FROM "${schema}".public_presence_document_version
        WHERE portal_id = $1::uuid
          AND template_id = $2
          AND ($3::text[] IS NULL OR document_state = ANY($3::text[]))
        ORDER BY version_number DESC
        LIMIT 1
      `,
      portalId,
      templateId,
      states ?? null
    );

    return toDocumentVersionRecord(rows[0]);
  }

  async findLatestVersionsByPortal(
    schema: string,
    portalId: string
  ): Promise<PublicPresenceDocumentVersionRecord[]> {
    const prisma = this.databaseService.getPrisma();

    const rows = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        WITH ranked_versions AS (
          SELECT
            id,
            portal_id as "portalId",
            version_number as "versionNumber",
            document_schema_version as "documentSchemaVersion",
            template_id as "templateId",
            template_asset_id as "templateAssetId",
            template_asset_revision_id as "templateAssetRevisionId",
            template_asset_source_hash as "templateAssetSourceHash",
            template_asset_snapshot as "templateAssetSnapshot",
            document,
            document_state as "documentState",
            content_hash_algorithm as "contentHashAlgorithm",
            content_hash as "contentHash",
            last_validation_snapshot_id as "lastValidationSnapshotId",
            scheduled_for as "scheduledFor",
            published_at as "publishedAt",
            published_by as "publishedBy",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy",
            row_number() OVER (
              PARTITION BY template_id
              ORDER BY version_number DESC
            ) as row_rank
          FROM "${schema}".public_presence_document_version
          WHERE portal_id = $1::uuid
        )
        SELECT
          id,
          "portalId",
          "versionNumber",
          "documentSchemaVersion",
          "templateId",
          "templateAssetId",
          "templateAssetRevisionId",
          "templateAssetSourceHash",
          "templateAssetSnapshot",
          document,
          "documentState",
          "contentHashAlgorithm",
          "contentHash",
          "lastValidationSnapshotId",
          "scheduledFor",
          "publishedAt",
          "publishedBy",
          "createdAt",
          "updatedAt",
          "createdBy"
        FROM ranked_versions
        WHERE row_rank = 1
        ORDER BY "versionNumber" DESC
      `,
      portalId
    );

    return rows
      .map((row) => toDocumentVersionRecord(row))
      .filter((row): row is PublicPresenceDocumentVersionRecord => Boolean(row));
  }

  async findDocumentVersionById(
    schema: string,
    versionId: string
  ): Promise<PublicPresenceDocumentVersionRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        SELECT
          id,
          portal_id as "portalId",
          version_number as "versionNumber",
          document_schema_version as "documentSchemaVersion",
          template_id as "templateId",
          template_asset_id as "templateAssetId",
          template_asset_revision_id as "templateAssetRevisionId",
          template_asset_source_hash as "templateAssetSourceHash",
          template_asset_snapshot as "templateAssetSnapshot",
          document,
          document_state as "documentState",
          content_hash_algorithm as "contentHashAlgorithm",
          content_hash as "contentHash",
          last_validation_snapshot_id as "lastValidationSnapshotId",
          scheduled_for as "scheduledFor",
          published_at as "publishedAt",
          published_by as "publishedBy",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy"
        FROM "${schema}".public_presence_document_version
        WHERE id = $1::uuid
      `,
      versionId
    );

    return toDocumentVersionRecord(versions[0]);
  }

  async createDraftVersionAndAssign(
    schema: string,
    input: PersistPublicPresenceDraftVersionInput
  ): Promise<{
    validationSnapshot: PublicPresenceValidationSnapshotRecord;
    version: PublicPresenceDocumentVersionRecord;
  }> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        acknowledgementIds: string[];
        blockerCount: number;
        blockerIds: string[];
        blocksAiPatch: boolean;
        blocksPublish: boolean;
        blocksVisualEdit: boolean;
        contentHash: string;
        contentHashAlgorithm: string;
        document: Record<string, unknown>;
        documentSchemaVersion: string;
        documentState: string;
        fatalCount: number;
        infoCount: number;
        issueCounts: PublicPresenceValidationSnapshotRecord['issueCounts'];
        lastValidationSnapshotId: string | null;
        portalId: string;
        projectionHash: string | null;
        publishedAt: Date | null;
        publishedBy: string | null;
        registryVersion: string;
        safetyPolicyVersion: string;
        scheduledFor: Date | null;
        snapshot: Record<string, unknown>;
        snapshotCreatedAt: Date;
        snapshotCreatedBy: string | null;
        templateId: string;
        templateAssetId: string | null;
        templateAssetRevisionId: string | null;
        templateAssetSourceHash: string | null;
        templateAssetSnapshot: Record<string, unknown> | null;
        validationMode: string;
        validationSnapshotId: string;
        validationState: string;
        validationVersionId: string;
        versionCreatedAt: Date;
        versionCreatedBy: string | null;
        versionId: string;
        versionNumber: number;
        versionUpdatedAt: Date;
        warningCount: number;
      }>
    >(
      `
        WITH inserted_version AS (
          INSERT INTO "${schema}".public_presence_document_version
            (
              id,
              portal_id,
              version_number,
              document_schema_version,
              template_id,
              template_asset_id,
              template_asset_revision_id,
              template_asset_source_hash,
              template_asset_snapshot,
              document,
              document_state,
              content_hash_algorithm,
              content_hash,
              created_at,
              updated_at,
              created_by
            )
          VALUES
            (
              gen_random_uuid(),
              $1::uuid,
              $2,
              $3,
              $4,
              $5::uuid,
              $6::uuid,
              $7,
              $8::jsonb,
              $9::jsonb,
              'draft',
              $10,
              $11,
              now(),
              now(),
              $12::uuid
            )
          RETURNING
            id as "versionId",
            portal_id as "portalId",
            version_number as "versionNumber",
            document_schema_version as "documentSchemaVersion",
            template_id as "templateId",
            template_asset_id as "templateAssetId",
            template_asset_revision_id as "templateAssetRevisionId",
            template_asset_source_hash as "templateAssetSourceHash",
            template_asset_snapshot as "templateAssetSnapshot",
            document,
            document_state as "documentState",
            content_hash_algorithm as "contentHashAlgorithm",
            content_hash as "contentHash",
            last_validation_snapshot_id as "lastValidationSnapshotId",
            scheduled_for as "scheduledFor",
            published_at as "publishedAt",
            published_by as "publishedBy",
            created_at as "versionCreatedAt",
            updated_at as "versionUpdatedAt",
            created_by as "versionCreatedBy"
        ),
        inserted_snapshot AS (
          INSERT INTO "${schema}".public_presence_validation_snapshot
            (
              id,
              portal_id,
              version_id,
              validation_mode,
              validation_state,
              fatal_count,
              blocker_count,
              warning_count,
              info_count,
              issue_counts,
              blocker_ids,
              acknowledgement_ids,
              blocks_publish,
              blocks_visual_edit,
              blocks_ai_patch,
              projection_hash,
              registry_version,
              safety_policy_version,
              snapshot,
              created_at,
              created_by
            )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            inserted_version."versionId",
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19::jsonb,
            $20::jsonb,
            $21::jsonb,
            $22,
            $23,
            $24,
            $25,
            $26,
            $27,
            $28::jsonb,
            now(),
            $12::uuid
          FROM inserted_version
          RETURNING
            id as "validationSnapshotId",
            portal_id as "portalId",
            version_id as "validationVersionId",
            validation_mode as "validationMode",
            validation_state as "validationState",
            fatal_count as "fatalCount",
            blocker_count as "blockerCount",
            warning_count as "warningCount",
            info_count as "infoCount",
            issue_counts as "issueCounts",
            blocker_ids as "blockerIds",
            acknowledgement_ids as "acknowledgementIds",
            blocks_publish as "blocksPublish",
            blocks_visual_edit as "blocksVisualEdit",
            blocks_ai_patch as "blocksAiPatch",
            projection_hash as "projectionHash",
            registry_version as "registryVersion",
            safety_policy_version as "safetyPolicyVersion",
            snapshot,
            created_at as "snapshotCreatedAt",
            created_by as "snapshotCreatedBy"
        ),
        updated_version AS (
          UPDATE "${schema}".public_presence_document_version
          SET
            last_validation_snapshot_id = (SELECT "validationSnapshotId" FROM inserted_snapshot),
            updated_at = now()
          WHERE id = (SELECT "versionId" FROM inserted_version)
          RETURNING id
        ),
        updated_portal AS (
          UPDATE "${schema}".public_presence_portal
          SET
            draft_version_id = (SELECT "versionId" FROM inserted_version),
            latest_version_number = $2,
            latest_validation_state = $14,
            last_validated_at = now(),
            updated_at = now(),
            updated_by = $12::uuid,
            version = version + 1
          WHERE id = $1::uuid
          RETURNING id
        ),
        inserted_event AS (
          INSERT INTO "${schema}".public_presence_workflow_event
            (
              id,
              portal_id,
              version_id,
              event_type,
              from_document_state,
              to_document_state,
              content_hash_algorithm,
              content_hash,
              payload,
              occurred_at,
              actor_id
            )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            inserted_version."versionId",
            'draftSaved',
            'draft',
            'draft',
            inserted_version."contentHashAlgorithm",
            inserted_version."contentHash",
            jsonb_build_object(
              'validationSnapshotId',
              (SELECT "validationSnapshotId" FROM inserted_snapshot)
            ),
            now(),
            $12::uuid
          FROM inserted_version
        )
        SELECT
          inserted_version."versionId",
          inserted_version."portalId",
          inserted_version."versionNumber",
          inserted_version."documentSchemaVersion",
          inserted_version."templateId",
          inserted_version."templateAssetId",
          inserted_version."templateAssetRevisionId",
          inserted_version."templateAssetSourceHash",
          inserted_version."templateAssetSnapshot",
          inserted_version.document,
          inserted_version."documentState",
          inserted_version."contentHashAlgorithm",
          inserted_version."contentHash",
          (SELECT "validationSnapshotId" FROM inserted_snapshot) as "lastValidationSnapshotId",
          inserted_version."scheduledFor",
          inserted_version."publishedAt",
          inserted_version."publishedBy",
          inserted_version."versionCreatedAt",
          now() as "versionUpdatedAt",
          inserted_version."versionCreatedBy",
          inserted_snapshot."validationSnapshotId",
          inserted_snapshot."validationMode",
          inserted_snapshot."validationState",
          inserted_snapshot."fatalCount",
          inserted_snapshot."blockerCount",
          inserted_snapshot."warningCount",
          inserted_snapshot."infoCount",
          inserted_snapshot."issueCounts",
          inserted_snapshot."blockerIds",
          inserted_snapshot."acknowledgementIds",
          inserted_snapshot."blocksPublish",
          inserted_snapshot."blocksVisualEdit",
          inserted_snapshot."blocksAiPatch",
          inserted_snapshot."projectionHash",
          inserted_snapshot."registryVersion",
          inserted_snapshot."safetyPolicyVersion",
          inserted_snapshot.snapshot,
          inserted_snapshot."snapshotCreatedAt",
          inserted_snapshot."snapshotCreatedBy",
          inserted_snapshot."validationVersionId"
        FROM inserted_version
        CROSS JOIN inserted_snapshot
      `,
      input.portalId,
      input.versionNumber,
      input.document.schemaVersion,
      input.document.templateId,
      input.templateAssetPin?.assetId ?? null,
      input.templateAssetPin?.assetRevisionId ?? null,
      input.templateAssetPin?.sourceHash ?? null,
      JSON.stringify(input.templateAssetPin?.snapshot ?? null),
      JSON.stringify(input.document),
      input.contentHashAlgorithm,
      input.contentHash,
      input.actorId,
      input.validationSnapshot.validationMode,
      input.validationState,
      input.validationPersistence.fatalCount,
      input.validationPersistence.blockerCount,
      input.validationPersistence.warningCount,
      input.validationPersistence.infoCount,
      JSON.stringify(input.validationPersistence.issueCounts),
      JSON.stringify(input.validationPersistence.blockerIds),
      JSON.stringify(input.validationPersistence.acknowledgementIds),
      input.validationPersistence.blocksPublish,
      input.validationPersistence.blocksVisualEdit,
      input.validationPersistence.blocksAiPatch,
      input.validationPersistence.projectionHash,
      input.validationPersistence.registryVersion,
      input.validationPersistence.safetyPolicyVersion,
      JSON.stringify(input.validationSnapshot)
    );

    const row = rows[0];

    return {
      version: toDocumentVersionRecord({
        contentHash: row.contentHash,
        contentHashAlgorithm: row.contentHashAlgorithm,
        createdAt: row.versionCreatedAt,
        createdBy: row.versionCreatedBy,
        document: row.document,
        documentSchemaVersion: row.documentSchemaVersion,
        documentState: row.documentState,
        id: row.versionId,
        lastValidationSnapshotId: row.lastValidationSnapshotId,
        portalId: row.portalId,
        publishedAt: row.publishedAt,
        publishedBy: row.publishedBy,
        scheduledFor: row.scheduledFor,
        templateAssetId: row.templateAssetId,
        templateAssetRevisionId: row.templateAssetRevisionId,
        templateAssetSnapshot: row.templateAssetSnapshot,
        templateAssetSourceHash: row.templateAssetSourceHash,
        templateId: row.templateId,
        updatedAt: row.versionUpdatedAt,
        versionNumber: row.versionNumber,
      })!,
      validationSnapshot: {
        id: row.validationSnapshotId,
        portalId: row.portalId,
        versionId: row.validationVersionId,
        validationMode: row.validationMode,
        validationState: row.validationState,
        fatalCount: row.fatalCount,
        blockerCount: row.blockerCount,
        warningCount: row.warningCount,
        infoCount: row.infoCount,
        issueCounts: row.issueCounts,
        blockerIds: row.blockerIds,
        acknowledgementIds: row.acknowledgementIds,
        blocksPublish: row.blocksPublish,
        blocksVisualEdit: row.blocksVisualEdit,
        blocksAiPatch: row.blocksAiPatch,
        projectionHash: row.projectionHash,
        registryVersion: row.registryVersion,
        safetyPolicyVersion: row.safetyPolicyVersion,
        snapshot: row.snapshot,
        createdAt: row.snapshotCreatedAt,
        createdBy: row.snapshotCreatedBy,
      },
    };
  }

  async createValidationSnapshotForExistingDraft(
    schema: string,
    input: PersistPublicPresenceValidationSnapshotInput
  ): Promise<PublicPresenceValidationSnapshotRecord> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceValidationSnapshotRecord[]>(
      `
        WITH inserted_snapshot AS (
          INSERT INTO "${schema}".public_presence_validation_snapshot
            (
              id,
              portal_id,
              version_id,
              validation_mode,
              validation_state,
              fatal_count,
              blocker_count,
              warning_count,
              info_count,
              issue_counts,
              blocker_ids,
              acknowledgement_ids,
              blocks_publish,
              blocks_visual_edit,
              blocks_ai_patch,
              projection_hash,
              registry_version,
              safety_policy_version,
              snapshot,
              created_at,
              created_by
            )
          VALUES
            (
              gen_random_uuid(),
              $1::uuid,
              $2::uuid,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9::jsonb,
              $10::jsonb,
              $11::jsonb,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18::jsonb,
              now(),
              $19::uuid
            )
          RETURNING
            id,
            portal_id as "portalId",
            version_id as "versionId",
            validation_mode as "validationMode",
            validation_state as "validationState",
            fatal_count as "fatalCount",
            blocker_count as "blockerCount",
            warning_count as "warningCount",
            info_count as "infoCount",
            issue_counts as "issueCounts",
            blocker_ids as "blockerIds",
            acknowledgement_ids as "acknowledgementIds",
            blocks_publish as "blocksPublish",
            blocks_visual_edit as "blocksVisualEdit",
            blocks_ai_patch as "blocksAiPatch",
            projection_hash as "projectionHash",
            registry_version as "registryVersion",
            safety_policy_version as "safetyPolicyVersion",
            snapshot,
            created_at as "createdAt",
            created_by as "createdBy"
        ),
        updated_version AS (
          UPDATE "${schema}".public_presence_document_version
          SET
            last_validation_snapshot_id = (SELECT id FROM inserted_snapshot),
            updated_at = now()
          WHERE id = $2::uuid
          RETURNING id
        ),
        updated_portal AS (
          UPDATE "${schema}".public_presence_portal
          SET
            latest_validation_state = $4,
            last_validated_at = now(),
            updated_at = now(),
            updated_by = $19::uuid,
            version = version + 1
          WHERE id = $1::uuid
          RETURNING id
        ),
        inserted_event AS (
          INSERT INTO "${schema}".public_presence_workflow_event
            (
              id,
              portal_id,
              version_id,
              event_type,
              from_document_state,
              to_document_state,
              content_hash_algorithm,
              content_hash,
              payload,
              occurred_at,
              actor_id
            )
          VALUES
            (
              gen_random_uuid(),
              $1::uuid,
              $2::uuid,
              $20,
              $21,
              $21,
              $22,
              $23,
              jsonb_build_object('validationSnapshotId', (SELECT id FROM inserted_snapshot)),
              now(),
              $19::uuid
            )
        )
        SELECT *
        FROM inserted_snapshot
      `,
      input.portalId,
      input.versionId,
      input.validationSnapshot.validationMode,
      input.validationState,
      input.validationPersistence.fatalCount,
      input.validationPersistence.blockerCount,
      input.validationPersistence.warningCount,
      input.validationPersistence.infoCount,
      JSON.stringify(input.validationPersistence.issueCounts),
      JSON.stringify(input.validationPersistence.blockerIds),
      JSON.stringify(input.validationPersistence.acknowledgementIds),
      input.validationPersistence.blocksPublish,
      input.validationPersistence.blocksVisualEdit,
      input.validationPersistence.blocksAiPatch,
      input.validationPersistence.projectionHash,
      input.validationPersistence.registryVersion,
      input.validationPersistence.safetyPolicyVersion,
      JSON.stringify(input.validationSnapshot),
      input.actorId,
      input.eventType,
      input.documentState,
      input.contentHashAlgorithm,
      input.contentHash
    );

    return rows[0];
  }

  async findValidationSnapshotById(
    schema: string,
    snapshotId: string
  ): Promise<PublicPresenceValidationSnapshotRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceValidationSnapshotRecord[]>(
      `
        SELECT
          id,
          portal_id as "portalId",
          version_id as "versionId",
          validation_mode as "validationMode",
          validation_state as "validationState",
          fatal_count as "fatalCount",
          blocker_count as "blockerCount",
          warning_count as "warningCount",
          info_count as "infoCount",
          issue_counts as "issueCounts",
          blocker_ids as "blockerIds",
          acknowledgement_ids as "acknowledgementIds",
          blocks_publish as "blocksPublish",
          blocks_visual_edit as "blocksVisualEdit",
          blocks_ai_patch as "blocksAiPatch",
          projection_hash as "projectionHash",
          registry_version as "registryVersion",
          safety_policy_version as "safetyPolicyVersion",
          snapshot,
          created_at as "createdAt",
          created_by as "createdBy"
        FROM "${schema}".public_presence_validation_snapshot
        WHERE id = $1::uuid
      `,
      snapshotId
    );

    return rows[0] ?? null;
  }

  async findWorkflowEventsByPortalId(
    schema: string,
    portalId: string,
    limit = 20
  ): Promise<PublicPresenceWorkflowEventRecord[]> {
    const prisma = this.databaseService.getPrisma();

    return prisma.$queryRawUnsafe<PublicPresenceWorkflowEventRecord[]>(
      `
        SELECT
          id,
          portal_id as "portalId",
          version_id as "versionId",
          event_type as "eventType",
          from_document_state as "fromDocumentState",
          to_document_state as "toDocumentState",
          content_hash_algorithm as "contentHashAlgorithm",
          content_hash as "contentHash",
          payload,
          occurred_at as "occurredAt",
          actor_id as "actorId"
        FROM "${schema}".public_presence_workflow_event
        WHERE portal_id = $1::uuid
        ORDER BY occurred_at DESC
        LIMIT $2
      `,
      portalId,
      limit
    );
  }

  async findLatestWorkflowEventByVersionAndType(
    schema: string,
    versionId: string,
    eventType: string
  ): Promise<PublicPresenceWorkflowEventRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceWorkflowEventRecord[]>(
      `
        SELECT
          id,
          portal_id as "portalId",
          version_id as "versionId",
          event_type as "eventType",
          from_document_state as "fromDocumentState",
          to_document_state as "toDocumentState",
          content_hash_algorithm as "contentHashAlgorithm",
          content_hash as "contentHash",
          payload,
          occurred_at as "occurredAt",
          actor_id as "actorId"
        FROM "${schema}".public_presence_workflow_event
        WHERE version_id = $1::uuid
          AND event_type = $2
        ORDER BY occurred_at DESC
        LIMIT 1
      `,
      versionId,
      eventType
    );

    return rows[0] ?? null;
  }

  async updateDocumentWorkflowState(
    schema: string,
    input: UpdatePublicPresenceDocumentWorkflowStateInput
  ): Promise<PublicPresenceDocumentVersionRecord> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        WITH previous_version AS (
          SELECT document_state as "fromDocumentState"
          FROM "${schema}".public_presence_document_version
          WHERE id = $1::uuid
        ),
        updated_version AS (
          UPDATE "${schema}".public_presence_document_version
          SET
            document_state = $2,
            scheduled_for = $3::timestamptz,
            published_at = $4::timestamptz,
            published_by = $5::uuid,
            updated_at = now()
          WHERE id = $1::uuid
          RETURNING
            id,
            portal_id as "portalId",
            version_number as "versionNumber",
            document_schema_version as "documentSchemaVersion",
            template_id as "templateId",
            template_asset_id as "templateAssetId",
            template_asset_revision_id as "templateAssetRevisionId",
            template_asset_source_hash as "templateAssetSourceHash",
            template_asset_snapshot as "templateAssetSnapshot",
            document,
            document_state as "documentState",
            content_hash_algorithm as "contentHashAlgorithm",
            content_hash as "contentHash",
            last_validation_snapshot_id as "lastValidationSnapshotId",
            scheduled_for as "scheduledFor",
            published_at as "publishedAt",
            published_by as "publishedBy",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy"
        ),
        inserted_event AS (
          INSERT INTO "${schema}".public_presence_workflow_event
            (
              id,
              portal_id,
              version_id,
              event_type,
              from_document_state,
              to_document_state,
              content_hash_algorithm,
              content_hash,
              payload,
              occurred_at,
              actor_id
            )
          SELECT
            gen_random_uuid(),
            $6::uuid,
            $1::uuid,
            $7,
            (SELECT "fromDocumentState" FROM previous_version),
            $2,
            $8,
            $9,
            $10::jsonb,
            now(),
            $5::uuid
        )
        SELECT *
        FROM updated_version
      `,
      input.versionId,
      input.toDocumentState,
      input.scheduledFor ?? null,
      input.publishedAt ?? null,
      input.publishedBy ?? input.actorId,
      input.portalId,
      input.eventType,
      input.contentHashAlgorithm,
      input.contentHash,
      JSON.stringify(input.payload ?? {})
    );

    return toDocumentVersionRecord(rows[0])!;
  }

  async publishVersionAndAssignLive(
    schema: string,
    input: UpdatePublicPresenceDocumentWorkflowStateInput
  ): Promise<PublicPresenceDocumentVersionRecord> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        WITH current_portal AS (
          SELECT
            live_version_id as "liveVersionId",
            draft_version_id as "draftVersionId"
          FROM "${schema}".public_presence_portal
          WHERE id = $1::uuid
        ),
        previous_version AS (
          SELECT document_state as "fromDocumentState"
          FROM "${schema}".public_presence_document_version
          WHERE id = $2::uuid
        ),
        superseded_live AS (
          UPDATE "${schema}".public_presence_document_version
          SET
            document_state = 'superseded',
            updated_at = now()
          WHERE id = (SELECT "liveVersionId" FROM current_portal)
            AND id IS NOT NULL
            AND id != $2::uuid
          RETURNING id
        ),
        updated_version AS (
          UPDATE "${schema}".public_presence_document_version
          SET
            document_state = 'published',
            scheduled_for = NULL,
            published_at = $3::timestamptz,
            published_by = $4::uuid,
            updated_at = now()
          WHERE id = $2::uuid
          RETURNING
            id,
            portal_id as "portalId",
            version_number as "versionNumber",
            document_schema_version as "documentSchemaVersion",
            template_id as "templateId",
            template_asset_id as "templateAssetId",
            template_asset_revision_id as "templateAssetRevisionId",
            template_asset_source_hash as "templateAssetSourceHash",
            template_asset_snapshot as "templateAssetSnapshot",
            document,
            document_state as "documentState",
            content_hash_algorithm as "contentHashAlgorithm",
            content_hash as "contentHash",
            last_validation_snapshot_id as "lastValidationSnapshotId",
            scheduled_for as "scheduledFor",
            published_at as "publishedAt",
            published_by as "publishedBy",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy"
        ),
        updated_portal AS (
          UPDATE "${schema}".public_presence_portal
          SET
            live_version_id = $2::uuid,
            draft_version_id = $2::uuid,
            updated_at = now(),
            updated_by = $4::uuid,
            version = version + 1
          WHERE id = $1::uuid
          RETURNING id
        ),
        inserted_event AS (
          INSERT INTO "${schema}".public_presence_workflow_event
            (
              id,
              portal_id,
              version_id,
              event_type,
              from_document_state,
              to_document_state,
              content_hash_algorithm,
              content_hash,
              payload,
              occurred_at,
              actor_id
            )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            $2::uuid,
            $5,
            (SELECT "fromDocumentState" FROM previous_version),
            'published',
            $6,
            $7,
            $8::jsonb,
            now(),
            $4::uuid
        )
        SELECT *
        FROM updated_version
      `,
      input.portalId,
      input.versionId,
      input.publishedAt,
      input.publishedBy ?? input.actorId,
      input.eventType,
      input.contentHashAlgorithm,
      input.contentHash,
      JSON.stringify(input.payload ?? {})
    );

    return toDocumentVersionRecord(rows[0])!;
  }

  async createDocumentFromSourceAndAssignDraft(
    schema: string,
    input: CreatePublicPresenceDocumentFromSourceInput
  ): Promise<PublicPresenceDocumentVersionRecord> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<DocumentVersionRow[]>(
      `
        WITH inserted_version AS (
          INSERT INTO "${schema}".public_presence_document_version
            (
              id,
              portal_id,
              version_number,
              document_schema_version,
              template_id,
              template_asset_id,
              template_asset_revision_id,
              template_asset_source_hash,
              template_asset_snapshot,
              document,
              document_state,
              content_hash_algorithm,
              content_hash,
              created_at,
              updated_at,
              created_by
            )
          VALUES
            (
              gen_random_uuid(),
              $1::uuid,
              $2,
              $3,
              $4,
              $5::uuid,
              $6::uuid,
              $7,
              $8::jsonb,
              $9::jsonb,
              $10,
              $11,
              $12,
              now(),
              now(),
              $13::uuid
            )
          RETURNING
            id,
            portal_id as "portalId",
            version_number as "versionNumber",
            document_schema_version as "documentSchemaVersion",
            template_id as "templateId",
            template_asset_id as "templateAssetId",
            template_asset_revision_id as "templateAssetRevisionId",
            template_asset_source_hash as "templateAssetSourceHash",
            template_asset_snapshot as "templateAssetSnapshot",
            document,
            document_state as "documentState",
            content_hash_algorithm as "contentHashAlgorithm",
            content_hash as "contentHash",
            last_validation_snapshot_id as "lastValidationSnapshotId",
            scheduled_for as "scheduledFor",
            published_at as "publishedAt",
            published_by as "publishedBy",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy"
        ),
        updated_portal AS (
          UPDATE "${schema}".public_presence_portal
          SET
            draft_version_id = (SELECT id FROM inserted_version),
            latest_version_number = $2,
            updated_at = now(),
            updated_by = $13::uuid,
            version = version + 1
          WHERE id = $1::uuid
          RETURNING id
        ),
        inserted_event AS (
          INSERT INTO "${schema}".public_presence_workflow_event
            (
              id,
              portal_id,
              version_id,
              event_type,
              from_document_state,
              to_document_state,
              content_hash_algorithm,
              content_hash,
              payload,
              occurred_at,
              actor_id
            )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            (SELECT id FROM inserted_version),
            'rollbackDraftCreated',
            NULL,
            $10,
            $11,
            $12,
            $14::jsonb,
            now(),
            $13::uuid
        )
        SELECT *
        FROM inserted_version
      `,
      input.portalId,
      input.versionNumber,
      input.document.schemaVersion,
      input.templateId,
      input.templateAssetPin?.assetId ?? null,
      input.templateAssetPin?.assetRevisionId ?? null,
      input.templateAssetPin?.sourceHash ?? null,
      JSON.stringify(input.templateAssetPin?.snapshot ?? null),
      JSON.stringify(input.document),
      input.documentState,
      input.contentHashAlgorithm,
      input.contentHash,
      input.actorId,
      JSON.stringify({
        ...(input.payload ?? {}),
        sourceVersionId: input.sourceVersionId,
      })
    );

    return toDocumentVersionRecord(rows[0])!;
  }

  async findDueScheduledVersions(
    schema: string,
    dueBefore: Date
  ): Promise<PublicPresenceScheduledVersionRecord[]> {
    const prisma = this.databaseService.getPrisma();

    return prisma.$queryRawUnsafe<PublicPresenceScheduledVersionRecord[]>(
      `
        SELECT
          v.portal_id as "portalId",
          p.talent_id as "talentId",
          v.id as "versionId"
        FROM "${schema}".public_presence_document_version v
        JOIN "${schema}".public_presence_portal p
          ON p.id = v.portal_id
        WHERE v.document_state = 'scheduled'
          AND v.scheduled_for IS NOT NULL
          AND v.scheduled_for <= $1::timestamptz
      `,
      dueBefore
    );
  }

  async findLiveDebutRevealVersions(
    schema: string
  ): Promise<PublicPresenceScheduledVersionRecord[]> {
    const prisma = this.databaseService.getPrisma();

    return prisma.$queryRawUnsafe<PublicPresenceScheduledVersionRecord[]>(
      `
        SELECT
          p.id as "portalId",
          p.talent_id as "talentId",
          v.id as "versionId"
        FROM "${schema}".public_presence_portal p
        JOIN "${schema}".public_presence_document_version v
          ON v.id = p.live_version_id
        WHERE v.template_id = 'debutReveal'
          AND v.document_state = 'published'
      `
    );
  }
}
