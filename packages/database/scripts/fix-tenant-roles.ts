// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Deprecated legacy maintenance entry point.
//
// This script predates the shared RBAC catalog and is intentionally blocked.
// Running the old implementation could:
// - deactivate TENANT_ADMIN even though it now exists as a compatibility alias
// - mutate role state outside the authored catalog
// - hide drift by partially copying template role policies
//
// Use:
// - pnpm --filter @tcrn/database db:sync-rbac
// - pnpm --filter @tcrn/database db:audit-legacy-rbac
// - pnpm --filter @tcrn/database db:refresh-snapshots

console.error(
  [
    'Deprecated script blocked: packages/database/scripts/fix-tenant-roles.ts',
    'Reason: this script targets the pre-catalog RBAC model and can drift the current authored contract.',
    'Use pnpm --filter @tcrn/database db:sync-rbac for additive repair,',
    'pnpm --filter @tcrn/database db:audit-legacy-rbac for read-only analysis,',
    'and pnpm --filter @tcrn/database db:refresh-snapshots after approved data changes.',
  ].join('\n'),
);

process.exit(1);
