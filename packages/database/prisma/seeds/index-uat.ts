// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT seed orchestrator - Seeds UAT test data on top of base data

import { PrismaClient } from '@prisma/client';
import { seedUatTenants } from './20-uat-tenant';
import { seedUatOrganization } from './21-uat-organization';
import { seedUatUsers } from './22-uat-users';
import { seedUatCustomers } from './23-uat-customers';
import { seedUatMemberships } from './24-uat-memberships';
import { seedUatMarshmallow } from './25-uat-marshmallow';
import { seedUatHomepages } from './26-uat-homepage';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting UAT database seeding...\n');

  try {
    // Phase 1: Create UAT tenants
    console.log('📌 Phase 1: UAT Tenants');
    const uatTenants = await seedUatTenants(prisma);

    // Phase 2: Organization structure
    console.log('\n📌 Phase 2: UAT Organization Structure');
    const orgResult = await seedUatOrganization(prisma, uatTenants);

    // Phase 3: Users
    console.log('\n📌 Phase 3: UAT Users');
    await seedUatUsers(prisma, uatTenants, orgResult);

    // Phase 4: Customers
    console.log('\n📌 Phase 4: UAT Customers');
    const customersResult = await seedUatCustomers(prisma, uatTenants, orgResult);

    // Phase 5: Memberships
    console.log('\n📌 Phase 5: UAT Memberships');
    await seedUatMemberships(prisma, uatTenants, customersResult);

    // Phase 6: Marshmallow
    console.log('\n📌 Phase 6: UAT Marshmallow');
    await seedUatMarshmallow(prisma, uatTenants, orgResult);

    // Phase 7: Homepage
    console.log('\n📌 Phase 7: UAT Homepage');
    await seedUatHomepages(prisma, uatTenants, orgResult);

    console.log('\n✅ UAT seeding completed successfully!');
    console.log('ℹ️  UAT test data has been created for UAT_CORP and UAT_SOLO tenants.');
  } catch (error) {
    console.error('\n❌ UAT Seeding failed:', error);
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
