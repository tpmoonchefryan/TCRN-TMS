// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Roles and resources seed data (RBAC)

import { PrismaClient } from '@prisma/client';
import { seedRbacContract } from './_rbac-contract';

export async function seedRolesAndResources(prisma: PrismaClient) {
  console.log('  → Seeding roles and resources...');
  const result = await seedRbacContract(prisma);

  console.log(`    ✓ Created ${result.resourceCount} resources`);
  console.log(`    ✓ Created ${result.policyCount} policies`);
  console.log(`    ✓ Created ${result.roleCount} roles`);
  console.log(`    ✓ Created ${result.rolePolicyCount} role-policy mappings with effects`);
}
