ALTER TABLE IF EXISTS tenant_template.artist_stage
  DROP COLUMN IF EXISTS lifecycle_status_mapping,
  DROP COLUMN IF EXISTS homepage_policy_key;

DO $$
DECLARE
  tenant_schema_name text;
BEGIN
  FOR tenant_schema_name IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant\_%' ESCAPE '\'
      AND schema_name <> 'tenant_template'
  LOOP
    EXECUTE format(
      'ALTER TABLE IF EXISTS %I.artist_stage DROP COLUMN IF EXISTS lifecycle_status_mapping, DROP COLUMN IF EXISTS homepage_policy_key',
      tenant_schema_name
    );
  END LOOP;
END $$;
