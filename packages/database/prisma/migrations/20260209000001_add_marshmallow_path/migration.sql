-- Add marshmallow_path column to talent table for independent path routing
-- Homepage uses homepage_path, Marshmallow uses marshmallow_path

-- Update tenant_template schema
ALTER TABLE tenant_template.talent 
ADD COLUMN IF NOT EXISTS marshmallow_path VARCHAR(128) UNIQUE;

-- Create index for marshmallow_path lookup
CREATE INDEX IF NOT EXISTS idx_talent_marshmallow_path ON tenant_template.talent(marshmallow_path);

-- Apply to all existing tenant schemas
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT schema_name FROM public.tenant WHERE is_active = true
  LOOP
    EXECUTE format('
      ALTER TABLE %I.talent 
      ADD COLUMN IF NOT EXISTS marshmallow_path VARCHAR(128);
      
      CREATE INDEX IF NOT EXISTS idx_talent_marshmallow_path ON %I.talent(marshmallow_path);
    ', tenant_record.schema_name, tenant_record.schema_name);
  END LOOP;
END $$;
