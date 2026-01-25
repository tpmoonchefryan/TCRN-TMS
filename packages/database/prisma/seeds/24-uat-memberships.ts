// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Membership Records - Creates membership records for testing

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';
import { UatCustomersResult } from './23-uat-customers';

export async function seedUatMemberships(
  prisma: PrismaClient,
  uatTenants: UatTenantResult,
  uatCustomers: UatCustomersResult
): Promise<void> {
  console.log('  → Creating UAT membership records...');

  const systemUserId = '00000000-0000-0000-0000-000000000001';

  // Get membership configuration from public schema
  const membershipClasses = await prisma.membershipClass.findMany();
  const membershipTypes = await prisma.membershipType.findMany();
  const membershipLevels = await prisma.membershipLevel.findMany();
  const platforms = await prisma.socialPlatform.findMany({
    where: { code: { in: ['BILIBILI', 'YOUTUBE', 'FANBOX', 'PATREON', 'AFDIAN'] } }
  });

  const classMap: Record<string, string> = {};
  const typeMap: Record<string, string> = {};
  const levelMap: Record<string, string> = {};
  const platformMap: Record<string, string> = {};

  for (const c of membershipClasses) {
    classMap[c.code] = c.id;
  }
  for (const t of membershipTypes) {
    typeMap[t.code] = t.id;
  }
  for (const l of membershipLevels) {
    levelMap[l.code] = l.id;
  }
  for (const p of platforms) {
    platformMap[p.code] = p.id;
  }

  // ==========================================================================
  // UAT_CORP Memberships
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;

  // Tables are already copied from tenant_template with data, just get the IDs
  const corpMembershipClasses = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${corpSchema}".membership_class`
  );
  const corpMembershipTypes = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${corpSchema}".membership_type`
  );
  const corpMembershipLevels = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${corpSchema}".membership_level`
  );

  const corpClassMap: Record<string, string> = {};
  const corpTypeMap: Record<string, string> = {};
  const corpLevelMap: Record<string, string> = {};

  for (const c of corpMembershipClasses) corpClassMap[c.code] = c.id;
  for (const t of corpMembershipTypes) corpTypeMap[t.code] = t.id;
  for (const l of corpMembershipLevels) corpLevelMap[l.code] = l.id;

  // Membership configurations for variety
  const membershipConfigs = [
    // YouTube memberships
    { classCode: 'SUBSCRIPTION', typeCode: 'YOUTUBE_MEMBER', levelCode: 'YT_LEVEL_1', platformCode: 'YOUTUBE', autoRenew: true, daysValid: 30 },
    { classCode: 'SUBSCRIPTION', typeCode: 'YOUTUBE_MEMBER', levelCode: 'YT_LEVEL_2', platformCode: 'YOUTUBE', autoRenew: true, daysValid: 30 },
    { classCode: 'SUBSCRIPTION', typeCode: 'YOUTUBE_MEMBER', levelCode: 'YT_LEVEL_3', platformCode: 'YOUTUBE', autoRenew: false, daysValid: 30 },
    // Bilibili memberships
    { classCode: 'SUBSCRIPTION', typeCode: 'BILIBILI_DAREN', levelCode: 'BILI_JIANZHANG', platformCode: 'BILIBILI', autoRenew: true, daysValid: 30 },
    { classCode: 'SUBSCRIPTION', typeCode: 'BILIBILI_DAREN', levelCode: 'BILI_TIDU', platformCode: 'BILIBILI', autoRenew: true, daysValid: 30 },
    { classCode: 'SUBSCRIPTION', typeCode: 'BILIBILI_DAREN', levelCode: 'BILI_ZONGDU', platformCode: 'BILIBILI', autoRenew: false, daysValid: 30 },
    // FANBOX memberships
    { classCode: 'FANCLUB', typeCode: 'FANBOX', levelCode: 'FANBOX_100', platformCode: 'FANBOX', autoRenew: true, daysValid: 30 },
    { classCode: 'FANCLUB', typeCode: 'FANBOX', levelCode: 'FANBOX_500', platformCode: 'FANBOX', autoRenew: true, daysValid: 30 },
    { classCode: 'FANCLUB', typeCode: 'FANBOX', levelCode: 'FANBOX_1000', platformCode: 'FANBOX', autoRenew: false, daysValid: 30 },
    // Patreon memberships
    { classCode: 'FANCLUB', typeCode: 'PATREON', levelCode: 'PATREON_BASIC', platformCode: 'PATREON', autoRenew: true, daysValid: 30 },
    { classCode: 'FANCLUB', typeCode: 'PATREON', levelCode: 'PATREON_PREMIUM', platformCode: 'PATREON', autoRenew: true, daysValid: 30 },
    // Afdian memberships
    { classCode: 'SUPPORTER', typeCode: 'AFDIAN', levelCode: 'AFDIAN_BASIC', platformCode: 'AFDIAN', autoRenew: false, daysValid: 30 },
    { classCode: 'SUPPORTER', typeCode: 'AFDIAN', levelCode: 'AFDIAN_PREMIUM', platformCode: 'AFDIAN', autoRenew: true, daysValid: 30 },
  ];

  let corpMembershipCount = 0;
  const now = new Date();

  // Assign memberships to customers
  for (let i = 0; i < uatCustomers.corpCustomers.length && i < 40; i++) {
    const customerId = uatCustomers.corpCustomers[i];
    
    // Give each customer 1-2 memberships
    const numMemberships = (i % 3) + 1;
    for (let m = 0; m < numMemberships && m < 2; m++) {
      const config = membershipConfigs[(i + m) % membershipConfigs.length];
      
      const classId = corpClassMap[config.classCode];
      const typeId = corpTypeMap[config.typeCode];
      const levelId = corpLevelMap[config.levelCode];
      const platformId = platformMap[config.platformCode];

      if (!classId || !typeId || !levelId || !platformId) continue;

      // Vary valid dates: some active, some expired, some future
      let validFrom: Date;
      let validTo: Date | null;
      let isExpired = false;

      if (i % 10 === 0) {
        // Expired membership
        validFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        validTo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        isExpired = true;
      } else if (i % 15 === 0) {
        // Expiring soon (within 7 days)
        validFrom = new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000);
        validTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // Active membership
        validFrom = new Date(now.getTime() - ((i % 20) * 24 * 60 * 60 * 1000));
        validTo = new Date(now.getTime() + config.daysValid * 24 * 60 * 60 * 1000);
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "${corpSchema}".membership_record 
         (id, customer_id, platform_id, membership_class_id, membership_type_id, membership_level_id, 
          valid_from, valid_to, auto_renew, is_expired, note, created_at, updated_at, created_by, updated_by)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 
                 $6::timestamptz, $7::timestamptz, $8, $9, $10, now(), now(), $11::uuid, $11::uuid)
         ON CONFLICT DO NOTHING`,
        customerId, platformId, classId, typeId, levelId,
        validFrom.toISOString(), validTo?.toISOString() || null, config.autoRenew, isExpired,
        `UAT membership ${corpMembershipCount + 1}`,
        systemUserId
      );
      corpMembershipCount++;
    }
  }

  console.log(`    ✓ Created ${corpMembershipCount} membership records in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO Memberships
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;

  // Tables are already copied from tenant_template with data, just get the IDs
  const soloMembershipClasses = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${soloSchema}".membership_class`
  );
  const soloMembershipTypes = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${soloSchema}".membership_type`
  );
  const soloMembershipLevels = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${soloSchema}".membership_level`
  );

  const soloClassMap: Record<string, string> = {};
  const soloTypeMap: Record<string, string> = {};
  const soloLevelMap: Record<string, string> = {};

  for (const c of soloMembershipClasses) soloClassMap[c.code] = c.id;
  for (const t of soloMembershipTypes) soloTypeMap[t.code] = t.id;
  for (const l of soloMembershipLevels) soloLevelMap[l.code] = l.id;

  let soloMembershipCount = 0;

  // Simple memberships for solo customers
  for (let i = 0; i < uatCustomers.soloCustomers.length; i++) {
    const customerId = uatCustomers.soloCustomers[i];
    const config = i % 2 === 0 
      ? { classCode: 'SUBSCRIPTION', typeCode: 'BILIBILI_DAREN', levelCode: 'BILI_JIANZHANG', platformCode: 'BILIBILI' }
      : { classCode: 'FANCLUB', typeCode: 'FANBOX', levelCode: 'FANBOX_500', platformCode: 'FANBOX' };

    const classId = soloClassMap[config.classCode];
    const typeId = soloTypeMap[config.typeCode];
    const levelId = soloLevelMap[config.levelCode];
    const platformId = platformMap[config.platformCode];

    if (!classId || !typeId || !levelId || !platformId) continue;

    const validFrom = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const validTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${soloSchema}".membership_record 
       (id, customer_id, platform_id, membership_class_id, membership_type_id, membership_level_id, 
        valid_from, valid_to, auto_renew, is_expired, note, created_at, updated_at, created_by, updated_by)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 
               $6::timestamptz, $7::timestamptz, true, false, $8, now(), now(), $9::uuid, $9::uuid)
       ON CONFLICT DO NOTHING`,
      customerId, platformId, classId, typeId, levelId,
      validFrom.toISOString(), validTo.toISOString(),
      `Solo membership ${i + 1}`,
      systemUserId
    );
    soloMembershipCount++;
  }

  console.log(`    ✓ Created ${soloMembershipCount} membership records in UAT_SOLO`);
}
