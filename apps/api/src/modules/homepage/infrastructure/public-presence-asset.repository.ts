// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';

import { Prisma } from '@tcrn/database';
import type {
  LocalizedText,
  PublicPresenceAssetKind,
  PublicPresenceAssetManifest,
  PublicPresenceAssetOwnerType,
  PublicPresenceAssetStatus,
  PublicPresenceAssetValidationState,
  PublicPresenceSourceBundleFile,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';

export interface PublicPresenceAssetRow {
  assetKind: PublicPresenceAssetKind;
  code: string;
  componentType: string | null;
  createdAt: Date;
  currentRevisionId: string | null;
  description: LocalizedText;
  id: string;
  isSystem: boolean;
  name: LocalizedText;
  ownerId: string | null;
  ownerType: PublicPresenceAssetOwnerType;
  status: PublicPresenceAssetStatus;
  templateId: string | null;
  updatedAt: Date;
  version: number;
}

export interface PublicPresenceAssetRevisionRow {
  artifactStatus: PublicPresenceAssetStatus;
  assetId: string;
  createdAt: Date;
  createdBy: string | null;
  id: string;
  lastValidatedAt: Date | null;
  manifest: PublicPresenceAssetManifest;
  revisionNumber: number;
  runtimeContractVersion: string;
  sourceBundle: PublicPresenceSourceBundleFile[];
  sourceHash: string;
  submittedAt: Date | null;
  validationState: PublicPresenceAssetValidationState;
  validationSummary: {
    issueCount: number;
    passCount: number;
    warnCount: number;
  };
}

export interface PublicPresenceAssetScopeRef {
  ownerId: string | null;
  ownerType: PublicPresenceAssetOwnerType;
}

const ASSET_SELECT = `
  id,
  asset_kind as "assetKind",
  owner_type as "ownerType",
  owner_id as "ownerId",
  code,
  name,
  description,
  template_id as "templateId",
  component_type as "componentType",
  status,
  is_system as "isSystem",
  current_revision_id as "currentRevisionId",
  created_at as "createdAt",
  updated_at as "updatedAt",
  version
`;

const buildRevisionSelect = (alias?: string) => {
  const prefix = alias ? `${alias}.` : '';

  return `
    ${prefix}id as "id",
    ${prefix}asset_id as "assetId",
    ${prefix}revision_number as "revisionNumber",
    ${prefix}source_bundle as "sourceBundle",
    ${prefix}manifest as "manifest",
    ${prefix}validation_summary as "validationSummary",
    ${prefix}source_hash as "sourceHash",
    ${prefix}runtime_contract_version as "runtimeContractVersion",
    ${prefix}artifact_status as "artifactStatus",
    ${prefix}validation_state as "validationState",
    ${prefix}last_validated_at as "lastValidatedAt",
    ${prefix}submitted_at as "submittedAt",
    ${prefix}created_at as "createdAt",
    ${prefix}created_by as "createdBy"
  `;
};

@Injectable()
export class PublicPresenceAssetRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  withTransaction<T>(operation: (prisma: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async resolveScopeChain(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<PublicPresenceAssetScopeRef[]> {
    const prisma = this.databaseService.getPrisma();
    const chain: PublicPresenceAssetScopeRef[] = [
      { ownerType: 'system', ownerId: null },
      { ownerType: 'tenant', ownerId: null },
    ];

    if (scopeType === 'tenant') {
      return chain;
    }

    if (scopeType === 'subsidiary' && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(
        `
          SELECT id, path
          FROM "${tenantSchema}".subsidiary
          WHERE id = $1::uuid
        `,
        scopeId
      );

      if (subsidiaries[0]) {
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%' AND path != $1
            ORDER BY length(path)
          `,
          subsidiaries[0].path
        );

        for (const ancestor of ancestors) {
          chain.push({ ownerType: 'subsidiary', ownerId: ancestor.id });
        }

        chain.push({ ownerType: 'subsidiary', ownerId: scopeId });
      }
    }

    if (scopeType === 'talent' && scopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ path: string }>>(
        `
          SELECT path
          FROM "${tenantSchema}".talent
          WHERE id = $1::uuid
        `,
        scopeId
      );

      if (talents[0]) {
        const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%'
            ORDER BY length(path)
          `,
          talents[0].path
        );

        for (const subsidiary of subsidiaries) {
          chain.push({ ownerType: 'subsidiary', ownerId: subsidiary.id });
        }
      }

      chain.push({ ownerType: 'talent', ownerId: scopeId });
    }

    return chain;
  }

  async listVisibleAssets(
    tenantSchema: string,
    visibleScopes: PublicPresenceAssetScopeRef[],
    assetKind?: PublicPresenceAssetKind
  ): Promise<PublicPresenceAssetRow[]> {
    const prisma = this.databaseService.getPrisma();
    const { params, whereClause } = this.buildVisibleScopeWhereClause(visibleScopes, 1);
    const assetKindClause = assetKind ? ` AND asset_kind = $${params.length + 1}` : '';

    return prisma.$queryRawUnsafe<PublicPresenceAssetRow[]>(
      `
        SELECT
          ${ASSET_SELECT}
        FROM "${tenantSchema}".public_presence_asset
        WHERE (${whereClause})${assetKindClause}
        ORDER BY
          CASE owner_type
            WHEN 'system' THEN 0
            WHEN 'tenant' THEN 1
            WHEN 'subsidiary' THEN 2
            ELSE 3
          END,
          is_system DESC,
          updated_at DESC,
          created_at DESC,
          code ASC
      `,
      ...(assetKind ? [...params, assetKind] : params)
    );
  }

  async listCurrentRevisionsByAssetIds(
    tenantSchema: string,
    assetIds: string[]
  ): Promise<PublicPresenceAssetRevisionRow[]> {
    if (assetIds.length === 0) {
      return [];
    }

    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<PublicPresenceAssetRevisionRow[]>(
      `
        SELECT
          ${buildRevisionSelect('r')}
        FROM "${tenantSchema}".public_presence_asset a
        JOIN "${tenantSchema}".public_presence_asset_revision r
          ON r.id = a.current_revision_id
        WHERE a.id = ANY($1::uuid[])
      `,
      assetIds
    );
  }

  async findAssetById(
    tenantSchema: string,
    assetId: string
  ): Promise<PublicPresenceAssetRow | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAssetRow[]>(
      `
        SELECT
          ${ASSET_SELECT}
        FROM "${tenantSchema}".public_presence_asset
        WHERE id = $1::uuid
      `,
      assetId
    );

    return rows[0] ?? null;
  }

  async findCurrentRevision(
    tenantSchema: string,
    assetId: string
  ): Promise<PublicPresenceAssetRevisionRow | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAssetRevisionRow[]>(
      `
        SELECT
          ${buildRevisionSelect('r')}
        FROM "${tenantSchema}".public_presence_asset a
        JOIN "${tenantSchema}".public_presence_asset_revision r
          ON r.id = a.current_revision_id
        WHERE a.id = $1::uuid
      `,
      assetId
    );

    return rows[0] ?? null;
  }

  async listRevisions(
    tenantSchema: string,
    assetId: string
  ): Promise<PublicPresenceAssetRevisionRow[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<PublicPresenceAssetRevisionRow[]>(
      `
        SELECT
          ${buildRevisionSelect()}
        FROM "${tenantSchema}".public_presence_asset_revision
        WHERE asset_id = $1::uuid
        ORDER BY revision_number DESC, created_at DESC
      `,
      assetId
    );
  }

  async findAssetByCodeAtScope(
    tenantSchema: string,
    ownerType: PublicPresenceAssetOwnerType,
    ownerId: string | null,
    code: string
  ): Promise<PublicPresenceAssetRow | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAssetRow[]>(
      `
        SELECT
          ${ASSET_SELECT}
        FROM "${tenantSchema}".public_presence_asset
        WHERE owner_type = $1
          AND owner_id IS NOT DISTINCT FROM $2::uuid
          AND code = $3
        LIMIT 1
      `,
      ownerType,
      ownerId,
      code
    );

    return rows[0] ?? null;
  }

  async listCodesAtScope(
    tenantSchema: string,
    ownerType: PublicPresenceAssetOwnerType,
    ownerId: string | null
  ): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
      `
        SELECT code
        FROM "${tenantSchema}".public_presence_asset
        WHERE owner_type = $1
          AND owner_id IS NOT DISTINCT FROM $2::uuid
      `,
      ownerType,
      ownerId
    );

    return rows.map((row) => row.code);
  }

  async createAssetWithCurrentRevision(
    tenantSchema: string,
    input: {
      actorId: string | null;
      artifactStatus: PublicPresenceAssetStatus;
      assetKind: PublicPresenceAssetKind;
      code: string;
      componentType: string | null;
      description: LocalizedText;
      manifest: PublicPresenceAssetManifest;
      name: LocalizedText;
      ownerId: string | null;
      ownerType: PublicPresenceAssetOwnerType;
      sourceBundle: PublicPresenceSourceBundleFile[];
      sourceHash: string;
      status: PublicPresenceAssetStatus;
      templateId: string | null;
      validationState: PublicPresenceAssetValidationState;
      validationSummary: {
        issueCount: number;
        passCount: number;
        warnCount: number;
      };
    }
  ): Promise<PublicPresenceAssetRow> {
    return this.withTransaction(async (prisma) => {
      const insertedAsset = (
        await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            INSERT INTO "${tenantSchema}".public_presence_asset (
              id,
              asset_kind,
              owner_type,
              owner_id,
              code,
              name,
              description,
              template_id,
              component_type,
              status,
              is_system,
              created_by,
              updated_by,
              version
            )
            VALUES (
              gen_random_uuid(),
              $1::text,
              $2::text,
              $3::uuid,
              $4::text,
              $5::jsonb,
              $6::jsonb,
              $7::text,
              $8::text,
              $9::text,
              $10::boolean,
              $11::uuid,
              $11::uuid,
              1
            )
            RETURNING id
          `,
          input.assetKind,
          input.ownerType,
          input.ownerId,
          input.code,
          JSON.stringify(input.name),
          JSON.stringify(input.description),
          input.templateId,
          input.componentType,
          input.status,
          input.ownerType === 'system',
          input.actorId
        )
      )[0];

      if (!insertedAsset?.id) {
        throw new Error('Created asset row was not returned.');
      }

      const insertedRevision = (
        await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            INSERT INTO "${tenantSchema}".public_presence_asset_revision (
              id,
              asset_id,
              revision_number,
              source_bundle,
              manifest,
              validation_summary,
              source_hash,
              runtime_contract_version,
              artifact_status,
              validation_state,
              last_validated_at,
              submitted_at,
              created_by
            )
            VALUES (
              gen_random_uuid(),
              $1::uuid,
              1,
              $2::jsonb,
              $3::jsonb,
              $4::jsonb,
              $5::text,
              $6::text,
              $7::text,
              $8::text,
              CASE WHEN $8::text = 'unvalidated' THEN NULL ELSE now() END,
              NULL,
              $9::uuid
            )
            RETURNING id
          `,
          insertedAsset.id,
          JSON.stringify(input.sourceBundle),
          JSON.stringify(input.manifest),
          JSON.stringify(input.validationSummary),
          input.sourceHash,
          input.manifest.runtimeContractVersion,
          input.artifactStatus,
          input.validationState,
          input.actorId
        )
      )[0];

      if (!insertedRevision?.id) {
        throw new Error('Created asset revision row was not returned.');
      }

      const rows = await prisma.$queryRawUnsafe<PublicPresenceAssetRow[]>(
        `
          UPDATE "${tenantSchema}".public_presence_asset
          SET
            current_revision_id = $2::uuid,
            updated_at = now()
          WHERE id = $1::uuid
          RETURNING ${ASSET_SELECT}
        `,
        insertedAsset.id,
        insertedRevision.id
      );

      if (!rows[0]) {
        throw new Error('Created asset could not be updated with its current revision.');
      }

      return rows[0];
    });
  }

  async createRevisionAndAssignCurrent(
    tenantSchema: string,
    input: {
      actorId: string | null;
      artifactStatus: PublicPresenceAssetStatus;
      assetId: string;
      description: LocalizedText;
      manifest: PublicPresenceAssetManifest;
      name: LocalizedText;
      sourceBundle: PublicPresenceSourceBundleFile[];
      sourceHash: string;
      status: PublicPresenceAssetStatus;
      validationState: PublicPresenceAssetValidationState;
      validationSummary: {
        issueCount: number;
        passCount: number;
        warnCount: number;
      };
    }
  ): Promise<PublicPresenceAssetRow> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<PublicPresenceAssetRow[]>(
      `
        WITH next_revision AS (
          SELECT COALESCE(MAX(revision_number), 0) + 1 as revision_number
          FROM "${tenantSchema}".public_presence_asset_revision
          WHERE asset_id = $1::uuid
        ),
        inserted_revision AS (
          INSERT INTO "${tenantSchema}".public_presence_asset_revision (
            id,
            asset_id,
            revision_number,
            source_bundle,
            manifest,
            validation_summary,
            source_hash,
            runtime_contract_version,
            artifact_status,
            validation_state,
            last_validated_at,
            submitted_at,
            created_by
          )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            revision_number,
            $2::jsonb,
            $3::jsonb,
            $4::jsonb,
            $5::text,
            $6::text,
            $7::text,
            $8::text,
            CASE WHEN $8::text = 'unvalidated' THEN NULL ELSE now() END,
            NULL,
            $9::uuid
          FROM next_revision
          RETURNING id
        ),
        updated_asset AS (
          UPDATE "${tenantSchema}".public_presence_asset
          SET
            name = $10::jsonb,
            description = $11::jsonb,
            status = $12::text,
            current_revision_id = (SELECT id FROM inserted_revision),
            updated_at = now(),
            updated_by = $9::uuid,
            version = version + 1
          WHERE id = $1::uuid
          RETURNING ${ASSET_SELECT}
        )
        SELECT * FROM updated_asset
      `,
      input.assetId,
      JSON.stringify(input.sourceBundle),
      JSON.stringify(input.manifest),
      JSON.stringify(input.validationSummary),
      input.sourceHash,
      input.manifest.runtimeContractVersion,
      input.artifactStatus,
      input.validationState,
      input.actorId,
      JSON.stringify(input.name),
      JSON.stringify(input.description),
      input.status
    );

    return rows[0];
  }

  private buildVisibleScopeWhereClause(
    visibleScopes: PublicPresenceAssetScopeRef[],
    startingParamIndex: number
  ): { params: Array<string | null>; whereClause: string } {
    const params: Array<string | null> = [];
    const conditions = visibleScopes.map((scope, index) => {
      const ownerTypeIndex = startingParamIndex + index * 2;
      const ownerIdIndex = ownerTypeIndex + 1;
      params.push(scope.ownerType, scope.ownerId);

      return `(owner_type = $${ownerTypeIndex} AND owner_id IS NOT DISTINCT FROM $${ownerIdIndex}::uuid)`;
    });

    return {
      params,
      whereClause: conditions.join(' OR '),
    };
  }
}
