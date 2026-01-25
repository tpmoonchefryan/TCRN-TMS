-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add inheritance control fields to external_blocklist_pattern

-- Add sort_order column
ALTER TABLE tenant_template.external_blocklist_pattern
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Add is_force_use column (controls whether child scopes can disable this pattern)
ALTER TABLE tenant_template.external_blocklist_pattern
ADD COLUMN IF NOT EXISTS is_force_use BOOLEAN NOT NULL DEFAULT false;

-- Add is_system column (marks system-preset patterns)
ALTER TABLE tenant_template.external_blocklist_pattern
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Add index for sort_order to optimize ordering queries
CREATE INDEX IF NOT EXISTS idx_external_blocklist_pattern_sort_order 
ON tenant_template.external_blocklist_pattern(sort_order);

-- Comments
COMMENT ON COLUMN tenant_template.external_blocklist_pattern.sort_order IS 'Display order for sorting patterns';
COMMENT ON COLUMN tenant_template.external_blocklist_pattern.is_force_use IS 'If true, child scopes cannot disable this pattern';
COMMENT ON COLUMN tenant_template.external_blocklist_pattern.is_system IS 'If true, this is a system-preset pattern';
