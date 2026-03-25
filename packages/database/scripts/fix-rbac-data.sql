-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Deprecated legacy maintenance entry point.
--
-- The previous version of this script wrote pre-catalog RBAC resources, roles,
-- and policy semantics such as:
-- - system_user.manage / role.manage / config.entity
-- - TENANT_READONLY / SUBSIDIARY_MANAGER / REPORT_OPERATOR
-- - policy.effect = 'allow'
--
-- That no longer matches the authored source of truth in packages/shared/src/rbac/catalog.ts.
-- Use:
-- - pnpm --filter @tcrn/database db:sync-rbac
-- - pnpm --filter @tcrn/database db:audit-legacy-rbac
-- - pnpm --filter @tcrn/database db:refresh-snapshots

DO $$
BEGIN
  RAISE EXCEPTION
    'Deprecated script blocked: packages/database/scripts/fix-rbac-data.sql. Use db:sync-rbac and db:audit-legacy-rbac instead.';
END
$$;
