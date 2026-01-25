// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Organization Structure - Creates subsidiaries and talents for testing

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';

export interface UatOrganizationResult {
  subsidiaries: Record<string, string>;
  talents: Record<string, string>;
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

  // First, create a profile store for the tenant
  const corpProfileStoreResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${corpSchema}".profile_store (id, code, name_en, name_zh, name_ja, is_active, created_at, updated_at, version)
     VALUES (gen_random_uuid(), 'DEFAULT_STORE', 'Default Store', '默认存储', 'デフォルトストア', true, now(), now(), 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id`
  );
  const corpProfileStoreId = corpProfileStoreResult[0].id;

  // Level 1: Headquarters
  const hqResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, 'HQ', '/HQ/', 0, 'Headquarters', '总部', '本社', 1, true, now(), now(), $1::uuid, $1::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id`,
    systemUserId
  );
  subsidiaries['HQ'] = hqResult[0].id;

  // Level 2: Business Units under HQ
  const buResults = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES 
       (gen_random_uuid(), $1::uuid, 'BU_GAMING', '/HQ/BU_GAMING/', 1, 'Gaming Division', '游戏事业部', 'ゲーム事業部', 1, true, now(), now(), $2::uuid, $2::uuid, 1),
       (gen_random_uuid(), $1::uuid, 'BU_MUSIC', '/HQ/BU_MUSIC/', 1, 'Music Division', '音乐事业部', '音楽事業部', 2, true, now(), now(), $2::uuid, $2::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id, code`,
    subsidiaries['HQ'], systemUserId
  );
  for (const bu of buResults) {
    subsidiaries[bu.code] = bu.id;
  }

  // Level 3: Studios under Gaming Division
  const studioResults = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `INSERT INTO "${corpSchema}".subsidiary (id, parent_id, code, path, depth, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
     VALUES 
       (gen_random_uuid(), $1::uuid, 'STUDIO_A', '/HQ/BU_GAMING/STUDIO_A/', 2, 'Studio Alpha', '阿尔法工作室', 'スタジオアルファ', 1, true, now(), now(), $2::uuid, $2::uuid, 1),
       (gen_random_uuid(), $1::uuid, 'STUDIO_B', '/HQ/BU_GAMING/STUDIO_B/', 2, 'Studio Beta', '贝塔工作室', 'スタジオベータ', 2, true, now(), now(), $2::uuid, $2::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id, code`,
    subsidiaries['BU_GAMING'], systemUserId
  );
  for (const studio of studioResults) {
    subsidiaries[studio.code] = studio.id;
  }

  console.log(`    ✓ Created 5 subsidiaries in UAT_CORP`);

  // Create Talents for UAT_CORP
  const corpTalents = [
    { code: 'TALENT_SAKURA', nameEn: 'Sakura', nameZh: '樱花', nameJa: 'さくら', displayName: 'Sakura Ch.', subsidiaryId: subsidiaries['STUDIO_A'], path: 'sakura-ch' },
    { code: 'TALENT_LUNA', nameEn: 'Luna', nameZh: '露娜', nameJa: 'ルナ', displayName: 'Luna Gaming', subsidiaryId: subsidiaries['STUDIO_A'], path: 'luna-gaming' },
    { code: 'TALENT_HANA', nameEn: 'Hana', nameZh: '花', nameJa: 'はな', displayName: 'Hana Live', subsidiaryId: subsidiaries['STUDIO_B'], path: 'hana-live' },
    { code: 'TALENT_MELODY', nameEn: 'Melody', nameZh: '旋律', nameJa: 'メロディ', displayName: 'Melody Music', subsidiaryId: subsidiaries['BU_MUSIC'], path: 'melody-music' },
  ];

  for (const talent of corpTalents) {
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".talent (id, subsidiary_id, profile_store_id, code, path, name_en, name_zh, name_ja, display_name, homepage_path, timezone, is_active, settings, created_at, updated_at, created_by, updated_by, version)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, 'Asia/Tokyo', true, '{}'::jsonb, now(), now(), $10::uuid, $10::uuid, 1)
       ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
       RETURNING id`,
      talent.subsidiaryId, corpProfileStoreId, talent.code, `/${talent.code}/`, talent.nameEn, talent.nameZh, talent.nameJa, talent.displayName, talent.path, systemUserId
    );
    talents[talent.code] = result[0].id;
  }

  console.log(`    ✓ Created 4 talents in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO: Single creator setup
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;

  // Create profile store for solo tenant
  const soloProfileStoreResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${soloSchema}".profile_store (id, code, name_en, name_zh, name_ja, is_active, created_at, updated_at, version)
     VALUES (gen_random_uuid(), 'DEFAULT_STORE', 'Default Store', '默认存储', 'デフォルトストア', true, now(), now(), 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id`
  );
  const soloProfileStoreId = soloProfileStoreResult[0].id;

  // Create solo talent (no subsidiary)
  const soloTalent = {
    code: 'TALENT_SOLO_STAR',
    nameEn: 'Solo Star',
    nameZh: '独立之星',
    nameJa: 'ソロスター',
    displayName: 'Solo Star Channel',
    path: 'solo-star',
  };

  const soloResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${soloSchema}".talent (id, subsidiary_id, profile_store_id, code, path, name_en, name_zh, name_ja, display_name, homepage_path, timezone, is_active, settings, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, $1::uuid, $2, $3, $4, $5, $6, $7, $8, 'Asia/Shanghai', true, '{}'::jsonb, now(), now(), $9::uuid, $9::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id`,
    soloProfileStoreId, soloTalent.code, `/${soloTalent.code}/`, soloTalent.nameEn, soloTalent.nameZh, soloTalent.nameJa, soloTalent.displayName, soloTalent.path, systemUserId
  );
  talents[soloTalent.code] = soloResult[0].id;

  // Create a second solo talent for variety
  const soloTalent2 = {
    code: 'TALENT_INDIE_CREATOR',
    nameEn: 'Indie Creator',
    nameZh: '独立创作者',
    nameJa: 'インディークリエイター',
    displayName: 'Indie Creative',
    path: 'indie-creator',
  };

  const soloResult2 = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${soloSchema}".talent (id, subsidiary_id, profile_store_id, code, path, name_en, name_zh, name_ja, display_name, homepage_path, timezone, is_active, settings, created_at, updated_at, created_by, updated_by, version)
     VALUES (gen_random_uuid(), NULL, $1::uuid, $2, $3, $4, $5, $6, $7, $8, 'Asia/Shanghai', true, '{}'::jsonb, now(), now(), $9::uuid, $9::uuid, 1)
     ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING id`,
    soloProfileStoreId, soloTalent2.code, `/${soloTalent2.code}/`, soloTalent2.nameEn, soloTalent2.nameZh, soloTalent2.nameJa, soloTalent2.displayName, soloTalent2.path, systemUserId
  );
  talents[soloTalent2.code] = soloResult2[0].id;

  console.log(`    ✓ Created 2 talents in UAT_SOLO`);

  return { subsidiaries, talents };
}
