-- Bind tenant-local SSO account links to the provider issuer snapshot.
-- This prevents a provider record issuer rotation from reusing older subject links.

ALTER TABLE tenant_template.tms_sso_account_link
  ADD COLUMN IF NOT EXISTS provider_issuer VARCHAR(512);

UPDATE tenant_template.tms_sso_account_link link
SET provider_issuer = COALESCE(
  provider.issuer_url,
  provider.authorization_url,
  provider.jwks_url,
  provider.provider_type || ':' || provider.code,
  'legacy:' || link.provider_code
)
FROM public.tms_sso_provider provider
WHERE provider.id = link.provider_id
  AND link.provider_issuer IS NULL;

UPDATE tenant_template.tms_sso_account_link
SET provider_issuer = 'legacy:' || provider_code
WHERE provider_issuer IS NULL;

ALTER TABLE tenant_template.tms_sso_account_link
  ALTER COLUMN provider_issuer SET NOT NULL;

DROP INDEX IF EXISTS tenant_template.tms_sso_account_link_provider_subject_idx;
DROP INDEX IF EXISTS tenant_template.tms_sso_account_link_active_subject_unique;
DROP INDEX IF EXISTS tenant_template.tms_sso_account_link_active_user_provider_unique;

CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_issuer_subject_idx
  ON tenant_template.tms_sso_account_link(provider_id, provider_issuer, subject);

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_subject_unique
  ON tenant_template.tms_sso_account_link(provider_id, provider_issuer, subject)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_user_provider_unique
  ON tenant_template.tms_sso_account_link(user_id, provider_id, provider_issuer)
  WHERE revoked_at IS NULL;

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
    IF to_regclass(format('%I.tms_sso_account_link', tenant_schema)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.tms_sso_account_link ADD COLUMN IF NOT EXISTS provider_issuer VARCHAR(512)',
        tenant_schema
      );

      EXECUTE format(
        'UPDATE %I.tms_sso_account_link link
         SET provider_issuer = COALESCE(
           provider.issuer_url,
           provider.authorization_url,
           provider.jwks_url,
           provider.provider_type || '':'' || provider.code,
           ''legacy:'' || link.provider_code
         )
         FROM public.tms_sso_provider provider
         WHERE provider.id = link.provider_id
           AND link.provider_issuer IS NULL',
        tenant_schema
      );

      EXECUTE format(
        'UPDATE %I.tms_sso_account_link
         SET provider_issuer = ''legacy:'' || provider_code
         WHERE provider_issuer IS NULL',
        tenant_schema
      );

      EXECUTE format(
        'ALTER TABLE %I.tms_sso_account_link ALTER COLUMN provider_issuer SET NOT NULL',
        tenant_schema
      );

      EXECUTE format(
        'DROP INDEX IF EXISTS %I.tms_sso_account_link_provider_subject_idx',
        tenant_schema
      );
      EXECUTE format(
        'DROP INDEX IF EXISTS %I.tms_sso_account_link_active_subject_unique',
        tenant_schema
      );
      EXECUTE format(
        'DROP INDEX IF EXISTS %I.tms_sso_account_link_active_user_provider_unique',
        tenant_schema
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_issuer_subject_idx ON %I.tms_sso_account_link(provider_id, provider_issuer, subject)',
        tenant_schema
      );
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_subject_unique ON %I.tms_sso_account_link(provider_id, provider_issuer, subject) WHERE revoked_at IS NULL',
        tenant_schema
      );
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_user_provider_unique ON %I.tms_sso_account_link(user_id, provider_id, provider_issuer) WHERE revoked_at IS NULL',
        tenant_schema
      );
    END IF;
  END LOOP;
END $$;
