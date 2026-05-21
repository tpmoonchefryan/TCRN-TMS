// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

export type PublicPresenceAuthoringArtifactKind = 'component' | 'template';

export interface PublicPresenceAuthoringDraftRow {
  artifactKind: PublicPresenceAuthoringArtifactKind;
  artifactStatus: string;
  createdAt: Date;
  id: string;
  lastSavedAt: Date;
  lastValidatedAt: Date | null;
  sourceBundle: unknown;
  subjectKey: string;
  submittedAt: Date | null;
  talentId: string;
  updatedAt: Date;
  validationState: string;
  validationSummary: unknown;
  version: number;
}

@Injectable()
export class PublicPresenceAuthoringRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findBySubject(
    tenantSchema: string,
    talentId: string,
    artifactKind: PublicPresenceAuthoringArtifactKind,
    subjectKey: string,
  ): Promise<PublicPresenceAuthoringDraftRow | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAuthoringDraftRow[]>(
      `
        SELECT
          id,
          talent_id as "talentId",
          artifact_kind as "artifactKind",
          subject_key as "subjectKey",
          artifact_status as "artifactStatus",
          validation_state as "validationState",
          source_bundle as "sourceBundle",
          validation_summary as "validationSummary",
          last_saved_at as "lastSavedAt",
          last_validated_at as "lastValidatedAt",
          submitted_at as "submittedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${tenantSchema}".public_presence_authoring_draft
        WHERE talent_id = $1::uuid
          AND artifact_kind = $2
          AND subject_key = $3
        LIMIT 1
      `,
      talentId,
      artifactKind,
      subjectKey,
    );

    return rows[0] ?? null;
  }

  async listByKind(
    tenantSchema: string,
    talentId: string,
    artifactKind: PublicPresenceAuthoringArtifactKind,
  ): Promise<PublicPresenceAuthoringDraftRow[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<PublicPresenceAuthoringDraftRow[]>(
      `
        SELECT
          id,
          talent_id as "talentId",
          artifact_kind as "artifactKind",
          subject_key as "subjectKey",
          artifact_status as "artifactStatus",
          validation_state as "validationState",
          source_bundle as "sourceBundle",
          validation_summary as "validationSummary",
          last_saved_at as "lastSavedAt",
          last_validated_at as "lastValidatedAt",
          submitted_at as "submittedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${tenantSchema}".public_presence_authoring_draft
        WHERE talent_id = $1::uuid
          AND artifact_kind = $2
        ORDER BY updated_at DESC, created_at DESC
      `,
      talentId,
      artifactKind,
    );
  }

  async upsertDraft(
    tenantSchema: string,
    input: {
      actorId?: string | null;
      artifactKind: PublicPresenceAuthoringArtifactKind;
      artifactStatus: string;
      lastValidatedAt: Date | null;
      sourceBundle: unknown;
      subjectKey: string;
      submittedAt: Date | null;
      talentId: string;
      validationState: string;
      validationSummary: unknown;
    },
  ): Promise<PublicPresenceAuthoringDraftRow> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAuthoringDraftRow[]>(
      `
        INSERT INTO "${tenantSchema}".public_presence_authoring_draft (
          talent_id,
          artifact_kind,
          subject_key,
          artifact_status,
          validation_state,
          source_bundle,
          validation_summary,
          last_saved_at,
          last_validated_at,
          submitted_at,
          created_by,
          updated_by
        )
        VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7::jsonb,
          now(),
          $8::timestamptz,
          $9::timestamptz,
          $10::uuid,
          $10::uuid
        )
        ON CONFLICT (talent_id, artifact_kind, subject_key)
        DO UPDATE SET
          artifact_status = EXCLUDED.artifact_status,
          validation_state = EXCLUDED.validation_state,
          source_bundle = EXCLUDED.source_bundle,
          validation_summary = EXCLUDED.validation_summary,
          last_saved_at = now(),
          last_validated_at = EXCLUDED.last_validated_at,
          submitted_at = EXCLUDED.submitted_at,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by,
          version = "${tenantSchema}".public_presence_authoring_draft.version + 1
        RETURNING
          id,
          talent_id as "talentId",
          artifact_kind as "artifactKind",
          subject_key as "subjectKey",
          artifact_status as "artifactStatus",
          validation_state as "validationState",
          source_bundle as "sourceBundle",
          validation_summary as "validationSummary",
          last_saved_at as "lastSavedAt",
          last_validated_at as "lastValidatedAt",
          submitted_at as "submittedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      input.talentId,
      input.artifactKind,
      input.subjectKey,
      input.artifactStatus,
      input.validationState,
      JSON.stringify(input.sourceBundle),
      JSON.stringify(input.validationSummary),
      input.lastValidatedAt?.toISOString() ?? null,
      input.submittedAt?.toISOString() ?? null,
      input.actorId ?? null,
    );

    return rows[0];
  }
}
