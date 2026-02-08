-- Add custom_domain_ssl_mode column to talent table
-- Default value: 'auto' (Let's Encrypt auto-provisioning)
-- Other values: 'self_hosted' (customer reverse proxy), 'cloudflare' (Cloudflare for SaaS)

ALTER TABLE tenant_template.talent 
  ADD COLUMN IF NOT EXISTS custom_domain_ssl_mode VARCHAR(32) NOT NULL DEFAULT 'auto';

-- Add column to other schemas that have talent table
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' 
        AND schema_name != 'tenant_template'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.talent ADD COLUMN IF NOT EXISTS custom_domain_ssl_mode VARCHAR(32) NOT NULL DEFAULT ''auto''',
            schema_record.schema_name
        );
    END LOOP;
END $$;
