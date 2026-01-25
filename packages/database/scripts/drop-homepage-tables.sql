-- Drop homepage tables to allow clean migration of corrected schema
DROP TABLE IF EXISTS "tenant_default"."homepage_version" CASCADE;
DROP TABLE IF EXISTS "tenant_default"."homepage_component" CASCADE;
DROP TABLE IF EXISTS "tenant_default"."talent_homepage" CASCADE;

DROP TABLE IF EXISTS "tenant_ac"."homepage_version" CASCADE;
DROP TABLE IF EXISTS "tenant_ac"."homepage_component" CASCADE;
DROP TABLE IF EXISTS "tenant_ac"."talent_homepage" CASCADE;

DROP TABLE IF EXISTS "tenant_template"."homepage_version" CASCADE;
DROP TABLE IF EXISTS "tenant_template"."homepage_component" CASCADE;
DROP TABLE IF EXISTS "tenant_template"."talent_homepage" CASCADE;
