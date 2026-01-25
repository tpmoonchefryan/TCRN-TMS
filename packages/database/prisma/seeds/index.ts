// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Main seed orchestrator

import { PrismaClient } from '@prisma/client';
import { seedAcAdminUser, seedAcTenant } from './00-ac-tenant';
import { seedGlobalConfig } from './01-global-config';
import { seedSocialPlatforms } from './02-social-platforms';
import { seedRolesAndResources } from './03-roles-resources';
import { seedChannelCategories } from './03b-channel-category';
import { seedCustomerConfigs } from './04-customer-configs';
import { seedMembershipConfigs } from './05-membership-configs';
import { seedBlocklistEntries } from './06-blocklist';
import { seedExternalBlocklistPatterns } from './06b-external-blocklist';
import { seedSystemDictionary } from './07-system-dictionary';
import { seedEmailTemplates } from './08-email-templates';
import { seedPiiConfig } from './10-pii-config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (Clean Mode)...\n');

  try {
    // Phase 0: AC (Admin Console) tenant - must be created first
    console.log('📌 Phase 0: AC Tenant');
    const acTenant = await seedAcTenant(prisma);

    // Phase 1: Global configuration (public schema)
    console.log('\n📌 Phase 1: Global Configuration');
    await seedGlobalConfig(prisma);

    // Phase 2: Tenant template data (will be copied to tenant schema)
    console.log('\n📌 Phase 2: Template Data');
    await seedSocialPlatforms(prisma);
    await seedRolesAndResources(prisma);
    await seedChannelCategories(prisma);
    await seedCustomerConfigs(prisma);
    await seedMembershipConfigs(prisma);
    await seedBlocklistEntries(prisma);
    await seedExternalBlocklistPatterns(prisma);

    // Phase 3: AC Admin user (after roles are created)
    console.log('\n📌 Phase 3: AC Admin User');
    await seedAcAdminUser(prisma, acTenant);

    // Phase 4: System Dictionaries (public schema)
    console.log('\n📌 Phase 4: System Dictionaries');
    await seedSystemDictionary(prisma);

    // Phase 5: PII Configuration
    console.log('\n📌 Phase 5: PII Configuration');
    await seedPiiConfig(prisma);

    // Phase 6: Email Templates (public schema)
    console.log('\n📌 Phase 6: Email Templates');
    await seedEmailTemplates();

    console.log('\n✅ Clean seeding completed successfully!');
    console.log('ℹ️  Only AC tenant and system data created. No test tenants.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
