// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Public Presence system Artist Stage and asset seeds.

import { createHash, randomUUID } from 'node:crypto';

import { PrismaClient } from '../../src/generated/prisma/client';

import { createLocalizedText, type LocalizedText } from '../../../shared/src/constants/locale';
import {
  buildBlankPublicPresenceAssetSourceBundle,
  getPublicPresenceSystemAssetSeeds,
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
  type PublicPresenceAssetManifest,
  type PublicPresenceSystemAssetSeedDefinition,
} from '../../../shared/src/public-presence';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface ArtistStageSeed {
  artistStatusCode: 'draft' | 'published' | 'disabled';
  code: string;
  color: string;
  description: LocalizedText;
  homepageTemplateTypeCode: 'pending-reveal' | 'operating' | 'graduated';
  name: LocalizedText;
  sortOrder: number;
}

const ARTIST_STAGE_SEEDS: ArtistStageSeed[] = [
  {
    artistStatusCode: 'draft',
    code: 'pre-debut',
    color: '#7C3AED',
    description: createLocalizedText({
      en: 'Talent is preparing for public reveal.',
      zh_HANS: '艺人正在准备公开揭晓。',
      zh_HANT: '藝人正在準備公開揭曉。',
      ja: 'タレントは公開準備中です。',
      ko: '탤런트가 공개 준비 중입니다.',
      fr: 'Le talent prepare sa revelation publique.',
    }),
    homepageTemplateTypeCode: 'pending-reveal',
    name: createLocalizedText({
      en: 'Pre-debut',
      zh_HANS: '出道前',
      zh_HANT: '出道前',
      ja: 'デビュー前',
      ko: '데뷔 전',
      fr: 'Pre-debut',
    }),
    sortOrder: 10,
  },
  {
    artistStatusCode: 'published',
    code: 'active',
    color: '#059669',
    description: createLocalizedText({
      en: 'Talent is operating a public fan presence.',
      zh_HANS: '艺人正在运营公开粉丝主页。',
      zh_HANT: '藝人正在營運公開粉絲主頁。',
      ja: 'タレントは公開ファンプレゼンスを運用中です。',
      ko: '탤런트가 공개 팬 프레즌스를 운영 중입니다.',
      fr: 'Le talent exploite une presence fan publique.',
    }),
    homepageTemplateTypeCode: 'operating',
    name: createLocalizedText({
      en: 'Active',
      zh_HANS: '活跃',
      zh_HANT: '活躍',
      ja: 'アクティブ',
      ko: '활성',
      fr: 'Actif',
    }),
    sortOrder: 20,
  },
  {
    artistStatusCode: 'disabled',
    code: 'graduated',
    color: '#64748B',
    description: createLocalizedText({
      en: 'Talent is no longer operating but may keep an archived fan page.',
      zh_HANS: '艺人已停止运营，但可以保留归档粉丝主页。',
      zh_HANT: '藝人已停止營運，但可以保留歸檔粉絲主頁。',
      ja: 'タレントは運用終了済みですが、アーカイブページを保持できます。',
      ko: '탤런트는 운영을 종료했지만 아카이브 팬 페이지를 유지할 수 있습니다.',
      fr: 'Le talent n est plus exploite mais peut conserver une page fan archivee.',
    }),
    homepageTemplateTypeCode: 'graduated',
    name: createLocalizedText({
      en: 'Graduated',
      zh_HANS: '已毕业',
      zh_HANT: '已畢業',
      ja: '卒業済み',
      ko: '졸업',
      fr: 'Diplome',
    }),
    sortOrder: 30,
  },
];

interface IdRow {
  id: string;
}

function createSourceHash(input: {
  manifest: PublicPresenceAssetManifest;
  sourceBundle: unknown[];
}): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

async function ensureArtistStageSeed(
  prisma: PrismaClient,
  schemaName: string,
  seed: ArtistStageSeed,
): Promise<string> {
  const existing = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM "${schemaName}".artist_stage
      WHERE owner_type = 'tenant'
        AND owner_id IS NULL
        AND code = $1
      LIMIT 1
    `,
    seed.code,
  );

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schemaName}".artist_stage
        SET name = $2::jsonb,
            description = $3::jsonb,
            sort_order = $4,
            is_active = true,
            is_system = false,
            color = $5,
            artist_status_code = $6,
            homepage_template_type_code = $7,
            updated_at = now(),
            updated_by = $8::uuid,
            version = 1
        WHERE id = $1::uuid
      `,
      existing[0].id,
      JSON.stringify(seed.name),
      JSON.stringify(seed.description),
      seed.sortOrder,
      seed.color,
      seed.artistStatusCode,
      seed.homepageTemplateTypeCode,
      SYSTEM_USER_ID,
    );

    return existing[0].id;
  }

  const inserted = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      INSERT INTO "${schemaName}".artist_stage
        (id, owner_type, owner_id, code, name, description, sort_order,
         is_active, is_system, color, artist_status_code, homepage_template_type_code,
         created_at, updated_at, created_by, updated_by, version)
      VALUES
        (gen_random_uuid(), 'tenant', NULL, $1, $2::jsonb, $3::jsonb, $4,
         true, false, $5, $6, $7, now(), now(), $8::uuid, $8::uuid, 1)
      RETURNING id
    `,
    seed.code,
    JSON.stringify(seed.name),
    JSON.stringify(seed.description),
    seed.sortOrder,
    seed.color,
    seed.artistStatusCode,
    seed.homepageTemplateTypeCode,
    SYSTEM_USER_ID,
  );

  return inserted[0].id;
}

async function ensurePublicPresenceAssetSeed(
  prisma: PrismaClient,
  schemaName: string,
  seed: PublicPresenceSystemAssetSeedDefinition,
): Promise<string> {
  const existingAsset = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM "${schemaName}".public_presence_asset
      WHERE owner_type = 'system'
        AND owner_id IS NULL
        AND code = $1
      LIMIT 1
    `,
    seed.code,
  );
  const assetId = existingAsset[0]?.id ?? randomUUID();
  const existingRevision = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM "${schemaName}".public_presence_asset_revision
      WHERE asset_id = $1::uuid
        AND revision_number = 1
      LIMIT 1
    `,
    assetId,
  );
  const revisionId = existingRevision[0]?.id ?? randomUUID();
  const manifest = {
    ...seed.manifest,
    assetCode: seed.code,
    assetId,
    assetRevisionId: revisionId,
    description: seed.description,
    name: seed.name,
    ownerId: null,
    ownerType: 'system',
  } satisfies PublicPresenceAssetManifest;
  const sourceBundle = buildBlankPublicPresenceAssetSourceBundle({
    assetCode: seed.code,
    assetKind: seed.assetKind,
    componentType: seed.componentType,
    manifest,
    name: seed.name,
    templateId: seed.templateId,
  });
  const sourceHash = createSourceHash({ manifest, sourceBundle });

  if (existingAsset[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schemaName}".public_presence_asset
        SET asset_kind = $2,
            name = $3::jsonb,
            description = $4::jsonb,
            template_id = $5,
            template_type_code = $6,
            component_type = $7,
            status = 'active',
            is_system = true,
            updated_at = now(),
            updated_by = $8::uuid,
            version = 1
        WHERE id = $1::uuid
      `,
      assetId,
      seed.assetKind,
      JSON.stringify(seed.name),
      JSON.stringify(seed.description),
      seed.templateId ?? null,
      seed.assetKind === 'template' ? seed.manifest.templateTypeCode : null,
      seed.componentType ?? null,
      SYSTEM_USER_ID,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${schemaName}".public_presence_asset
          (id, asset_kind, owner_type, owner_id, code, name, description,
           template_id, template_type_code, component_type, status, is_system,
           current_revision_id, created_at, updated_at, created_by, updated_by, version)
        VALUES
          ($1::uuid, $2, 'system', NULL, $3, $4::jsonb, $5::jsonb,
           $6, $7, $8, 'active', true, NULL, now(), now(), $9::uuid, $9::uuid, 1)
      `,
      assetId,
      seed.assetKind,
      seed.code,
      JSON.stringify(seed.name),
      JSON.stringify(seed.description),
      seed.templateId ?? null,
      seed.assetKind === 'template' ? seed.manifest.templateTypeCode : null,
      seed.componentType ?? null,
      SYSTEM_USER_ID,
    );
  }

  await prisma.$queryRawUnsafe<IdRow[]>(
    `
      INSERT INTO "${schemaName}".public_presence_asset_revision
        (id, asset_id, revision_number, source_bundle, manifest, validation_summary,
         source_hash, runtime_contract_version, artifact_status, validation_state,
         last_validated_at, submitted_at, created_at, created_by)
      VALUES
        ($1::uuid, $2::uuid, 1, $3::jsonb, $4::jsonb, $5::jsonb,
         $6, $7, 'active', 'ready', now(), NULL, now(), $8::uuid)
      ON CONFLICT (asset_id, revision_number) DO UPDATE SET
        source_bundle = EXCLUDED.source_bundle,
        manifest = EXCLUDED.manifest,
        validation_summary = EXCLUDED.validation_summary,
        source_hash = EXCLUDED.source_hash,
        runtime_contract_version = EXCLUDED.runtime_contract_version,
        artifact_status = EXCLUDED.artifact_status,
        validation_state = EXCLUDED.validation_state,
        last_validated_at = now()
      RETURNING id
    `,
    revisionId,
    assetId,
    JSON.stringify(sourceBundle),
    JSON.stringify(manifest),
    JSON.stringify({
      issueCount: 0,
      passCount: sourceBundle.length,
      warnCount: 0,
    }),
    sourceHash,
    PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
    SYSTEM_USER_ID,
  );

  await prisma.$executeRawUnsafe(
    `
      UPDATE "${schemaName}".public_presence_asset
      SET current_revision_id = $2::uuid,
          updated_at = now(),
          updated_by = $3::uuid
      WHERE id = $1::uuid
    `,
    assetId,
    revisionId,
    SYSTEM_USER_ID,
  );

  return assetId;
}

export async function seedPublicPresenceSystemAssets(
  prisma: PrismaClient,
  schemaName = 'tenant_template',
): Promise<void> {
  console.log(`  → Seeding Public Presence system assets in ${schemaName}...`);

  for (const stageSeed of ARTIST_STAGE_SEEDS) {
    await ensureArtistStageSeed(prisma, schemaName, stageSeed);
  }

  for (const assetSeed of getPublicPresenceSystemAssetSeeds()) {
    await ensurePublicPresenceAssetSeed(prisma, schemaName, assetSeed);
  }

  console.log(`    ✓ Public Presence stages and assets ready in ${schemaName}`);
}
