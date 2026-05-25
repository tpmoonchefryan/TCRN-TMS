ALTER TABLE tenant_template.artist_stage
  ADD COLUMN IF NOT EXISTS homepage_template_type_code VARCHAR(64);

UPDATE tenant_template.artist_stage
SET homepage_template_type_code = CASE COALESCE(NULLIF(artist_status_code, ''), 'draft')
  WHEN 'draft' THEN 'pending-reveal'
  WHEN 'published' THEN 'operating'
  WHEN 'disabled' THEN 'graduated'
  ELSE 'operating'
END
WHERE homepage_template_type_code IS NULL OR homepage_template_type_code = '';

ALTER TABLE tenant_template.artist_stage
  ALTER COLUMN homepage_template_type_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS artist_stage_homepage_template_type_code_idx
  ON tenant_template.artist_stage(homepage_template_type_code);

DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant\_%' ESCAPE '\'
      AND schema_name <> 'tenant_template'
  LOOP
    IF to_regclass(format('%I.artist_stage', tenant_schema)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.artist_stage ADD COLUMN IF NOT EXISTS homepage_template_type_code VARCHAR(64)',
        tenant_schema
      );

      EXECUTE format(
        $SQL$
          WITH tenant_settings AS (
            SELECT settings->'artistLifecycleFlow'->'homepagePolicyByStage' AS policies
            FROM public.tenant
            WHERE schema_name = %L
            LIMIT 1
          ),
          policy AS (
            SELECT
              stage_policy->>'stageId' AS stage_id,
              stage_policy->'allowedTemplateTypeCodes'->>0 AS template_type_code
            FROM tenant_settings,
              jsonb_array_elements(COALESCE(policies, '[]'::jsonb)) AS stage_policy
            WHERE stage_policy->'allowedTemplateTypeCodes'->>0 IS NOT NULL
              AND stage_policy->'allowedTemplateTypeCodes'->>0 IN ('pending-reveal', 'operating', 'graduated')
          )
          UPDATE %I.artist_stage AS stage
          SET homepage_template_type_code = policy.template_type_code
          FROM policy
          WHERE stage.id::text = policy.stage_id
            AND (stage.homepage_template_type_code IS NULL OR stage.homepage_template_type_code = '')
        $SQL$,
        tenant_schema,
        tenant_schema
      );

      EXECUTE format(
        'UPDATE %I.artist_stage SET homepage_template_type_code = CASE COALESCE(NULLIF(artist_status_code, ''''), ''draft'') WHEN ''draft'' THEN ''pending-reveal'' WHEN ''published'' THEN ''operating'' WHEN ''disabled'' THEN ''graduated'' ELSE ''operating'' END WHERE homepage_template_type_code IS NULL OR homepage_template_type_code = ''''',
        tenant_schema
      );

      EXECUTE format(
        'ALTER TABLE %I.artist_stage ALTER COLUMN homepage_template_type_code SET NOT NULL',
        tenant_schema
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS artist_stage_homepage_template_type_code_idx ON %I.artist_stage(homepage_template_type_code)',
        tenant_schema
      );
    END IF;
  END LOOP;
END $$;
