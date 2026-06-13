// SPDX-License-Identifier: Apache-2.0
// UAT Organization Structure - Creates subsidiaries and talents for testing

import { PrismaClient } from '../../src/platform/prisma/client';

import { createLocalizedText } from '../../../shared/src/constants/locale';

import { UatTenantResult } from './20-uat-tenant';

export interface UatOrganizationResult {
  subsidiaries: Record<string, string>;
  talents: Record<string, string>;
}

type UatArtistStageKey = 'draft' | 'published' | 'disabled';

async function resolveUatArtistStageIds(
  prisma: PrismaClient,
  schema: string,
): Promise<Record<UatArtistStageKey, string>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ artistStatusCode: UatArtistStageKey; id: string }>>(
    `
      SELECT id, artist_status_code as "artistStatusCode"
      FROM "${schema}".artist_stage
      WHERE owner_type = 'tenant'
        AND owner_id IS NULL
        AND is_active = true
        AND artist_status_code IN ('draft', 'published', 'disabled')
      ORDER BY sort_order ASC, created_at ASC
    `,
  );
  const byStatus = new Map<UatArtistStageKey, string>();

  for (const row of rows) {
    if (!byStatus.has(row.artistStatusCode)) {
      byStatus.set(row.artistStatusCode, row.id);
    }
  }

  for (const status of ['draft', 'published', 'disabled'] as const) {
    if (!byStatus.has(status)) {
      throw new Error(`Missing active ${status} artist stage in ${schema}. Run base seed first.`);
    }
  }

  return {
    disabled: byStatus.get('disabled')!,
    draft: byStatus.get('draft')!,
    published: byStatus.get('published')!,
  };
}

async function upsertTenantDefaultProfileStore(
  prisma: PrismaClient,
  schema: string,
  systemUserId: string,
): Promise<string> {
  const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${schema}".profile_store
     (id, code, name, description,
     pii_service_config_id, is_default, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), 'DEFAULT_STORE', $1::jsonb, $2::jsonb,
      NULL, true, true, now(), now(), $3::uuid, $3::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET 
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       pii_service_config_id = EXCLUDED.pii_service_config_id
     RETURNING id`,
    JSON.stringify(createLocalizedText({
      en: 'Default Profile Store',
      zh_HANS: '默认档案存储',
      zh_HANT: '默认档案存储',
      ja: 'デフォルトプロファイルストア',
      ko: 'Default Profile Store',
      fr: 'Default Profile Store',
    })),
    JSON.stringify(createLocalizedText({
      en: 'Default customer archive boundary',
      zh_HANS: '默认客户档案边界',
      zh_HANT: '默认客户档案边界',
      ja: 'デフォルト顧客アーカイブ境界',
      ko: 'Default customer archive boundary',
      fr: 'Default customer archive boundary',
    })),
    systemUserId,
  );

  return result[0].id;
}

export async function seedUatOrganization(
  prisma: PrismaClient,
  uatTenants: UatTenantResult
): Promise<UatOrganizationResult> {
  console.log('  → Creating UAT organization structure...');

  const subsidiaries: Record<string, string> = {};
  const talents: Record<string, string> = {};
  const systemUserId = '00000000-0000-0000-0000-000000000001';

  // ==========================================================================
  // UAT_CORP: Enterprise with nested subsidiaries
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;
  const corpArtistStageIds = await resolveUatArtistStageIds(prisma, corpSchema);

  const corpProfileStoreId = await upsertTenantDefaultProfileStore(
    prisma,
    corpSchema,
    systemUserId,
  );

  // Level 1: Headquarters
  const hqResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name, description, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, 'HQ', '/HQ/', 0, $1::jsonb, $2::jsonb, 1, true, now(), now(), $3::uuid, $3::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description
     RETURNING id`,
    JSON.stringify(createLocalizedText({
      en: 'Headquarters',
      zh_HANS: '总部',
      zh_HANT: '总部',
      ja: '本社',
      ko: 'Headquarters',
      fr: 'Headquarters',
    })),
    JSON.stringify(createLocalizedText({
      en: 'UAT corporate headquarters for acceptance coverage.',
      zh_HANS: '用于验收覆盖的 UAT 企业总部。',
      zh_HANT: '用於驗收覆蓋的 UAT 企業總部。',
      ja: '受け入れ検証用の UAT 企業本部です。',
      ko: 'UAT corporate headquarters for acceptance coverage.',
      fr: 'Siege UAT pour la couverture d acceptation.',
    })),
    systemUserId
  );
  subsidiaries['HQ'] = hqResult[0].id;

  // Level 2: Business Units under HQ
  const buResults = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name, description, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES 
       (gen_random_uuid(), $1::uuid, 'BU_GAMING', '/HQ/BU_GAMING/', 1, $2::jsonb, $3::jsonb, 1, true, now(), now(), $6::uuid, $6::uuid, 1),
       (gen_random_uuid(), $1::uuid, 'BU_MUSIC', '/HQ/BU_MUSIC/', 1, $4::jsonb, $5::jsonb, 2, true, now(), now(), $6::uuid, $6::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description
     RETURNING id, code`,
    subsidiaries['HQ'],
    JSON.stringify(createLocalizedText({
      en: 'Gaming Division',
      zh_HANS: '游戏事业部',
      zh_HANT: '游戏事业部',
      ja: 'ゲーム事業部',
      ko: 'Gaming Division',
      fr: 'Gaming Division',
    })),
    JSON.stringify(createLocalizedText({
      en: 'UAT gaming business unit for subsidiary-scoped acceptance paths.',
      zh_HANS: '用于分公司范围验收路径的 UAT 游戏事业部。',
      zh_HANT: '用於分公司範圍驗收路徑的 UAT 遊戲事業部。',
      ja: '子会社スコープ受け入れ経路用の UAT ゲーム事業部です。',
      ko: 'UAT gaming business unit for subsidiary-scoped acceptance paths.',
      fr: 'Division jeux UAT pour les parcours d acceptation au perimetre filiale.',
    })),
    JSON.stringify(createLocalizedText({
      en: 'Music Division',
      zh_HANS: '音乐事业部',
      zh_HANT: '音乐事业部',
      ja: '音楽事業部',
      ko: 'Music Division',
      fr: 'Music Division',
    })),
    JSON.stringify(createLocalizedText({
      en: 'UAT music business unit for cross-branch acceptance coverage.',
      zh_HANS: '用于跨分支验收覆盖的 UAT 音乐事业部。',
      zh_HANT: '用於跨分支驗收覆蓋的 UAT 音樂事業部。',
      ja: '複数部門の受け入れ検証用の UAT 音楽事業部です。',
      ko: 'UAT music business unit for cross-branch acceptance coverage.',
      fr: 'Division musique UAT pour la couverture d acceptation multi-branches.',
    })),
    systemUserId
  );
  for (const bu of buResults) {
    subsidiaries[bu.code] = bu.id;
  }

  // Level 3: Studios under Gaming Division
  const studioResults = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name, description, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES 
       (gen_random_uuid(), $1::uuid, 'STUDIO_A', '/HQ/BU_GAMING/STUDIO_A/', 2, $2::jsonb, $3::jsonb, 1, true, now(), now(), $6::uuid, $6::uuid, 1),
       (gen_random_uuid(), $1::uuid, 'STUDIO_B', '/HQ/BU_GAMING/STUDIO_B/', 2, $4::jsonb, $5::jsonb, 2, true, now(), now(), $6::uuid, $6::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description
     RETURNING id, code`,
    subsidiaries['BU_GAMING'],
    JSON.stringify(createLocalizedText({
      en: 'Studio Alpha',
      zh_HANS: '阿尔法工作室',
      zh_HANT: '阿尔法工作室',
      ja: 'スタジオアルファ',
      ko: 'Studio Alpha',
      fr: 'Studio Alpha',
    })),
    JSON.stringify(createLocalizedText({
      en: 'UAT studio branch for published public presence fixtures.',
      zh_HANS: '用于已发布 Public Presence fixture 的 UAT 工作室分支。',
      zh_HANT: '用於已發布 Public Presence fixture 的 UAT 工作室分支。',
      ja: '公開済み Public Presence フィクスチャ用の UAT スタジオ部門です。',
      ko: 'UAT studio branch for published public presence fixtures.',
      fr: 'Branche studio UAT pour les fixtures Public Presence publiees.',
    })),
    JSON.stringify(createLocalizedText({
      en: 'Studio Beta',
      zh_HANS: '贝塔工作室',
      zh_HANT: '贝塔工作室',
      ja: 'スタジオベータ',
      ko: 'Studio Beta',
      fr: 'Studio Beta',
    })),
    JSON.stringify(createLocalizedText({
      en: 'UAT studio branch for draft lifecycle acceptance fixtures.',
      zh_HANS: '用于草稿生命周期验收 fixture 的 UAT 工作室分支。',
      zh_HANT: '用於草稿生命週期驗收 fixture 的 UAT 工作室分支。',
      ja: 'ドラフトライフサイクル検証用の UAT スタジオ部門です。',
      ko: 'UAT studio branch for draft lifecycle acceptance fixtures.',
      fr: 'Branche studio UAT pour les fixtures de cycle brouillon.',
    })),
    systemUserId
  );
  for (const studio of studioResults) {
    subsidiaries[studio.code] = studio.id;
  }

  console.log(`    ✓ Created 5 subsidiaries in UAT_CORP`);

  // Create Talents for UAT_CORP
  const corpTalents = [
    { code: 'TALENT_SAKURA', name: createLocalizedText({
      en: 'Sakura',
      zh_HANS: '樱花',
      zh_HANT: '樱花',
      ja: 'さくら',
      ko: 'Sakura',
      fr: 'Sakura',
    }), description: createLocalizedText({
      en: 'Canonical published UAT talent for Public Presence acceptance.',
      zh_HANS: '用于 Public Presence 验收的标准已发布 UAT 艺人。',
      zh_HANT: '用於 Public Presence 驗收的標準已發布 UAT 藝人。',
      ja: 'Public Presence 受け入れ検証用の標準公開済み UAT タレントです。',
      ko: 'Canonical published UAT talent for Public Presence acceptance.',
      fr: 'Talent UAT publie canonique pour l acceptation Public Presence.',
    }), artistStageId: corpArtistStageIds.published, displayName: 'Sakura Ch.', lifecycleStatus: 'published', subsidiaryId: subsidiaries['STUDIO_A'], path: 'sakura-ch' },
    { code: 'TALENT_LUNA', name: createLocalizedText({
      en: 'Luna',
      zh_HANS: '露娜',
      zh_HANT: '露娜',
      ja: 'ルナ',
      ko: 'Luna',
      fr: 'Luna',
    }), description: createLocalizedText({
      en: 'Secondary published UAT talent for organization and homepage coverage.',
      zh_HANS: '用于组织与主页覆盖的第二个已发布 UAT 艺人。',
      zh_HANT: '用於組織與主頁覆蓋的第二個已發布 UAT 藝人。',
      ja: '組織とホームページ検証用の二つ目の公開済み UAT タレントです。',
      ko: 'Secondary published UAT talent for organization and homepage coverage.',
      fr: 'Second talent UAT publie pour la couverture organisation et page accueil.',
    }), artistStageId: corpArtistStageIds.published, displayName: 'Luna Gaming', lifecycleStatus: 'published', subsidiaryId: subsidiaries['STUDIO_A'], path: 'luna-gaming' },
    { code: 'TALENT_HANA', name: createLocalizedText({
      en: 'Hana',
      zh_HANS: '花',
      zh_HANT: '花',
      ja: 'はな',
      ko: 'Hana',
      fr: 'Hana',
    }), description: createLocalizedText({
      en: 'Draft UAT talent for lifecycle transition acceptance coverage.',
      zh_HANS: '用于生命周期流转验收覆盖的草稿 UAT 艺人。',
      zh_HANT: '用於生命週期流轉驗收覆蓋的草稿 UAT 藝人。',
      ja: 'ライフサイクル遷移の受け入れ検証用ドラフト UAT タレントです。',
      ko: 'Draft UAT talent for lifecycle transition acceptance coverage.',
      fr: 'Talent UAT brouillon pour la couverture d acceptation du cycle.',
    }), artistStageId: corpArtistStageIds.draft, displayName: 'Hana Live', lifecycleStatus: 'draft', subsidiaryId: subsidiaries['STUDIO_B'], path: 'hana-live' },
    { code: 'TALENT_MELODY', name: createLocalizedText({
      en: 'Melody',
      zh_HANS: '旋律',
      zh_HANT: '旋律',
      ja: 'メロディ',
      ko: 'Melody',
      fr: 'Melody',
    }), description: createLocalizedText({
      en: 'Published UAT talent in the music division for cross-subsidiary coverage.',
      zh_HANS: '音乐事业部中用于跨分公司覆盖的已发布 UAT 艺人。',
      zh_HANT: '音樂事業部中用於跨分公司覆蓋的已發布 UAT 藝人。',
      ja: '部門横断検証用の音楽事業部の公開済み UAT タレントです。',
      ko: 'Published UAT talent in the music division for cross-subsidiary coverage.',
      fr: 'Talent UAT publie dans la division musique pour la couverture multi-filiale.',
    }), artistStageId: corpArtistStageIds.published, displayName: 'Melody Music', lifecycleStatus: 'published', subsidiaryId: subsidiaries['BU_MUSIC'], path: 'melody-music' },
  ];

  for (const talent of corpTalents) {
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".talent (id, subsidiary_id, profile_store_id, artist_stage_id, code, path, name, description, display_name, homepage_path, timezone, is_active, lifecycle_status, published_at, published_by, settings, created_at, updated_at, created_by, updated_by, version)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb, $7::jsonb, $8, $9, 'Asia/Tokyo', true, $10::text, CASE WHEN $10::text = 'published' THEN now() ELSE NULL END, CASE WHEN $10::text = 'published' THEN $11::uuid ELSE NULL END, '{}'::jsonb, now(), now(), $11::uuid, $11::uuid, 1)
       ON CONFLICT (code) DO UPDATE SET
         subsidiary_id = EXCLUDED.subsidiary_id,
         profile_store_id = EXCLUDED.profile_store_id,
         artist_stage_id = EXCLUDED.artist_stage_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         display_name = EXCLUDED.display_name,
         homepage_path = EXCLUDED.homepage_path,
         lifecycle_status = EXCLUDED.lifecycle_status,
         published_at = EXCLUDED.published_at,
         published_by = EXCLUDED.published_by,
         updated_at = now(),
         updated_by = EXCLUDED.updated_by
       RETURNING id`,
      talent.subsidiaryId,
      corpProfileStoreId,
      talent.artistStageId,
      talent.code,
      `/${talent.code}/`,
      JSON.stringify(talent.name),
      JSON.stringify(talent.description),
      talent.displayName,
      talent.path,
      talent.lifecycleStatus,
      systemUserId
    );
    talents[talent.code] = result[0].id;
  }

  console.log(`    ✓ Created 4 talents in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO: Single creator setup
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;
  const soloArtistStageIds = await resolveUatArtistStageIds(prisma, soloSchema);

  const soloProfileStoreId = await upsertTenantDefaultProfileStore(
    prisma,
    soloSchema,
    systemUserId,
  );

  // Create solo talent (no subsidiary)
  const soloTalent = {
    code: 'TALENT_SOLO_STAR',
    name: createLocalizedText({
      en: 'Solo Star',
      zh_HANS: '独立之星',
      zh_HANT: '独立之星',
      ja: 'ソロスター',
      ko: 'Solo Star',
      fr: 'Solo Star',
    }),
    description: createLocalizedText({
      en: 'Published solo UAT talent for tenant-root acceptance coverage.',
      zh_HANS: '用于租户根范围验收覆盖的已发布独立 UAT 艺人。',
      zh_HANT: '用於租戶根範圍驗收覆蓋的已發布獨立 UAT 藝人。',
      ja: 'テナントルート検証用の公開済みソロ UAT タレントです。',
      ko: 'Published solo UAT talent for tenant-root acceptance coverage.',
      fr: 'Talent solo UAT publie pour la couverture d acceptation racine tenant.',
    }),
    displayName: 'Solo Star Channel',
    artistStageId: soloArtistStageIds.published,
    lifecycleStatus: 'published',
    path: 'solo-star',
  };

  const soloResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${soloSchema}".talent (id, subsidiary_id, profile_store_id, artist_stage_id, code, path, name, description, display_name, homepage_path, timezone, is_active, lifecycle_status, published_at, published_by, settings, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'Asia/Shanghai', true, $9::text, CASE WHEN $9::text = 'published' THEN now() ELSE NULL END, CASE WHEN $9::text = 'published' THEN $10::uuid ELSE NULL END, '{}'::jsonb, now(), now(), $10::uuid, $10::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET
       profile_store_id = EXCLUDED.profile_store_id,
       artist_stage_id = EXCLUDED.artist_stage_id,
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       display_name = EXCLUDED.display_name,
       homepage_path = EXCLUDED.homepage_path,
       lifecycle_status = EXCLUDED.lifecycle_status,
       published_at = EXCLUDED.published_at,
       published_by = EXCLUDED.published_by,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     RETURNING id`,
    soloProfileStoreId,
    soloTalent.artistStageId,
    soloTalent.code,
    `/${soloTalent.code}/`,
    JSON.stringify(soloTalent.name),
    JSON.stringify(soloTalent.description),
    soloTalent.displayName,
    soloTalent.path,
    soloTalent.lifecycleStatus,
    systemUserId
  );
  talents[soloTalent.code] = soloResult[0].id;

  // Create a second solo talent for variety
  const soloTalent2 = {
    code: 'TALENT_INDIE_CREATOR',
    name: createLocalizedText({
      en: 'Indie Creator',
      zh_HANS: '独立创作者',
      zh_HANT: '独立创作者',
      ja: 'インディークリエイター',
      ko: 'Indie Creator',
      fr: 'Indie Creator',
    }),
    description: createLocalizedText({
      en: 'Draft solo UAT talent for tenant-root lifecycle coverage.',
      zh_HANS: '用于租户根生命周期覆盖的草稿独立 UAT 艺人。',
      zh_HANT: '用於租戶根生命週期覆蓋的草稿獨立 UAT 藝人。',
      ja: 'テナントルートのライフサイクル検証用ドラフトソロ UAT タレントです。',
      ko: 'Draft solo UAT talent for tenant-root lifecycle coverage.',
      fr: 'Talent solo UAT brouillon pour la couverture du cycle racine tenant.',
    }),
    displayName: 'Indie Creative',
    artistStageId: soloArtistStageIds.draft,
    lifecycleStatus: 'draft',
    path: 'indie-creator',
  };

  const soloResult2 = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${soloSchema}".talent (id, subsidiary_id, profile_store_id, artist_stage_id, code, path, name, description, display_name, homepage_path, timezone, is_active, lifecycle_status, published_at, published_by, settings, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'Asia/Shanghai', true, $9::text, CASE WHEN $9::text = 'published' THEN now() ELSE NULL END, CASE WHEN $9::text = 'published' THEN $10::uuid ELSE NULL END, '{}'::jsonb, now(), now(), $10::uuid, $10::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET
       profile_store_id = EXCLUDED.profile_store_id,
       artist_stage_id = EXCLUDED.artist_stage_id,
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       display_name = EXCLUDED.display_name,
       homepage_path = EXCLUDED.homepage_path,
       lifecycle_status = EXCLUDED.lifecycle_status,
       published_at = EXCLUDED.published_at,
       published_by = EXCLUDED.published_by,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     RETURNING id`,
    soloProfileStoreId,
    soloTalent2.artistStageId,
    soloTalent2.code,
    `/${soloTalent2.code}/`,
    JSON.stringify(soloTalent2.name),
    JSON.stringify(soloTalent2.description),
    soloTalent2.displayName,
    soloTalent2.path,
    soloTalent2.lifecycleStatus,
    systemUserId
  );
  talents[soloTalent2.code] = soloResult2[0].id;

  console.log(`    ✓ Created 2 talents in UAT_SOLO`);

  return { subsidiaries, talents };
}
