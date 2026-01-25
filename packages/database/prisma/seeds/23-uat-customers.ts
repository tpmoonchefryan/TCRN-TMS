// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Customer Profiles - Creates customer profiles with platform identities

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';
import { UatOrganizationResult } from './21-uat-organization';

export interface UatCustomersResult {
  corpCustomers: string[];
  soloCustomers: string[];
}

// Customer names for generation
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Skyler', 'Drew'];
const LAST_NAMES = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
const JAPANESE_NAMES = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '伊藤健太', '渡辺結衣', '山本翔太', '中村愛', '小林大輝', '加藤さくら'];
const CHINESE_NAMES = ['张伟', '王芳', '李娜', '刘洋', '陈明', '杨静', '黄磊', '周敏', '吴刚', '郑悦'];
const NICKNAMES = ['CoolGamer', 'StarFan', 'MusicLover', 'ArtEnthusiast', 'TechWizard', 'CreativeSoul', 'HappyViewer', 'LoyalSupporter', 'DailyWatcher', 'ContentCreator'];

export async function seedUatCustomers(
  prisma: PrismaClient,
  uatTenants: UatTenantResult,
  uatOrg: UatOrganizationResult
): Promise<UatCustomersResult> {
  console.log('  → Creating UAT customer profiles...');

  const corpCustomers: string[] = [];
  const soloCustomers: string[] = [];
  const systemUserId = '00000000-0000-0000-0000-000000000001';

  // Get platform IDs
  const platforms = await prisma.socialPlatform.findMany({
    where: { code: { in: ['BILIBILI', 'YOUTUBE', 'TWITTER', 'TIKTOK'] } }
  });
  const platformMap: Record<string, string> = {};
  for (const p of platforms) {
    platformMap[p.code] = p.id;
  }

  // ==========================================================================
  // UAT_CORP Customers
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;

  // Get profile store and status IDs
  const corpProfileStore = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${corpSchema}".profile_store WHERE code = 'DEFAULT_STORE' LIMIT 1`
  );
  const corpProfileStoreId = corpProfileStore[0]?.id;

  const corpStatuses = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${corpSchema}".customer_status WHERE code IN ('ACTIVE', 'VIP', 'INACTIVE', 'PENDING', 'BLOCKED')`
  );
  const statusMap: Record<string, string> = {};
  for (const s of corpStatuses) {
    statusMap[s.code] = s.id;
  }

  // Create 50 individual customers across talents
  const corpTalentIds = [
    uatOrg.talents['TALENT_SAKURA'],
    uatOrg.talents['TALENT_LUNA'],
    uatOrg.talents['TALENT_HANA'],
    uatOrg.talents['TALENT_MELODY']
  ];

  const statusDistribution = [
    { status: 'ACTIVE', count: 30 },
    { status: 'VIP', count: 10 },
    { status: 'INACTIVE', count: 5 },
    { status: 'PENDING', count: 3 },
    { status: 'BLOCKED', count: 2 }
  ];

  let customerIndex = 0;
  for (const { status, count } of statusDistribution) {
    for (let i = 0; i < count; i++) {
      const talentId = corpTalentIds[customerIndex % corpTalentIds.length];
      const firstName = FIRST_NAMES[customerIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[customerIndex % LAST_NAMES.length];
      const nickname = `${NICKNAMES[customerIndex % NICKNAMES.length]}_${customerIndex}`;

      // Create customer profile
      const customerResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${corpSchema}".customer_profile 
         (id, talent_id, profile_store_id, origin_talent_id, rm_profile_id, profile_type, nickname, primary_language, status_id, notes, tags, source, is_active, created_at, updated_at, created_by, updated_by, version)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid, gen_random_uuid(), 'individual', $3, 'en', $4::uuid, $5, $6, 'uat_seed', true, now(), now(), $7::uuid, $7::uuid, 1)
         RETURNING id`,
        talentId, corpProfileStoreId, nickname, statusMap[status] || null, 
        `UAT customer ${customerIndex + 1}`, 
        ['uat', status.toLowerCase()],
        systemUserId
      );
      const customerId = customerResult[0].id;
      corpCustomers.push(customerId);

      // Create 2 platform identities per customer
      const platformCodes = Object.keys(platformMap);
      for (let p = 0; p < 2; p++) {
        const platformCode = platformCodes[(customerIndex + p) % platformCodes.length];
        const platformId = platformMap[platformCode];
        const platformUid = `uat_${platformCode.toLowerCase()}_${customerIndex}_${p}`;
        const platformNickname = `${nickname}_${platformCode}`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "${corpSchema}".platform_identity 
           (id, customer_id, platform_id, platform_uid, platform_nickname, is_current, captured_at, updated_at)
           VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, true, now(), now())
           ON CONFLICT DO NOTHING`,
          customerId, platformId, platformUid, platformNickname
        );
      }

      customerIndex++;
    }
  }

  console.log(`    ✓ Created ${customerIndex} individual customers in UAT_CORP`);

  // Create 10 company customers
  const companyNames = [
    'TechCorp Ltd', 'Creative Studio Inc', 'Media Partners', 'Digital Agency',
    'Entertainment Co', 'Gaming Studios', 'Music Label', 'Talent Agency',
    'Streaming Platform', 'Content Network'
  ];

  for (let i = 0; i < 10; i++) {
    const talentId = corpTalentIds[i % corpTalentIds.length];
    const companyName = companyNames[i];
    const nickname = companyName.replace(/\s+/g, '');

    const customerResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".customer_profile 
       (id, talent_id, profile_store_id, origin_talent_id, rm_profile_id, profile_type, nickname, primary_language, status_id, notes, tags, source, is_active, created_at, updated_at, created_by, updated_by, version)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid, gen_random_uuid(), 'company', $3, 'en', $4::uuid, $5, $6, 'uat_seed', true, now(), now(), $7::uuid, $7::uuid, 1)
       RETURNING id`,
      talentId, corpProfileStoreId, nickname, statusMap['ACTIVE'],
      `Business partner: ${companyName}`,
      ['uat', 'company', 'b2b'],
      systemUserId
    );
    corpCustomers.push(customerResult[0].id);
  }

  console.log(`    ✓ Created 10 company customers in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO Customers
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;

  // Get profile store for solo tenant
  const soloProfileStore = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${soloSchema}".profile_store WHERE code = 'DEFAULT_STORE' LIMIT 1`
  );
  const soloProfileStoreId = soloProfileStore[0]?.id;

  // Copy customer statuses from tenant_template to solo schema if not exists
  // First check if data already exists
  const existingStatuses = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int as count FROM "${soloSchema}".customer_status`
  );
  
  if ((existingStatuses[0]?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${soloSchema}".customer_status (id, owner_type, owner_id, code, name_en, name_zh, name_ja, color, sort_order, is_active, created_at, updated_at, version)
      SELECT gen_random_uuid(), owner_type, owner_id, code, name_en, name_zh, name_ja, color, sort_order, is_active, created_at, updated_at, version
      FROM tenant_template.customer_status
    `);
  }

  const soloStatuses = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${soloSchema}".customer_status WHERE code IN ('ACTIVE', 'VIP')`
  );
  const soloStatusMap: Record<string, string> = {};
  for (const s of soloStatuses) {
    soloStatusMap[s.code] = s.id;
  }

  const soloTalentId = uatOrg.talents['TALENT_SOLO_STAR'];

  // Create 20 customers for solo creator
  for (let i = 0; i < 20; i++) {
    const nickname = i < 10 
      ? `${JAPANESE_NAMES[i % JAPANESE_NAMES.length].replace(/\s+/g, '')}_fan`
      : `${CHINESE_NAMES[(i - 10) % CHINESE_NAMES.length]}_粉丝`;
    const status = i < 15 ? 'ACTIVE' : 'VIP';
    const language = i < 10 ? 'ja' : 'zh';

    const customerResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${soloSchema}".customer_profile 
       (id, talent_id, profile_store_id, origin_talent_id, rm_profile_id, profile_type, nickname, primary_language, status_id, notes, tags, source, is_active, created_at, updated_at, created_by, updated_by, version)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid, gen_random_uuid(), 'individual', $3, $4, $5::uuid, $6, $7, 'uat_seed', true, now(), now(), $8::uuid, $8::uuid, 1)
       RETURNING id`,
      soloTalentId, soloProfileStoreId, nickname, language, soloStatusMap[status] || null,
      `Solo fan ${i + 1}`,
      ['uat', 'solo', language],
      systemUserId
    );
    const customerId = customerResult[0].id;
    soloCustomers.push(customerId);

    // Add platform identity
    const platformCode = i % 2 === 0 ? 'BILIBILI' : 'YOUTUBE';
    const platformId = platformMap[platformCode];
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${soloSchema}".platform_identity 
       (id, customer_id, platform_id, platform_uid, platform_nickname, is_current, captured_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, true, now(), now())
       ON CONFLICT DO NOTHING`,
      customerId, platformId, `solo_${platformCode.toLowerCase()}_${i}`, nickname
    );
  }

  console.log(`    ✓ Created 20 customers in UAT_SOLO`);

  return { corpCustomers, soloCustomers };
}
