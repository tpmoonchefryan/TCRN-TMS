/*
  Warnings:

  - You are about to drop the column `changes` on the `change_log` table. All the data in the column will be lost.
  - You are about to drop the column `entity_id` on the `change_log` table. All the data in the column will be lost.
  - You are about to drop the column `entity_type` on the `change_log` table. All the data in the column will be lost.
  - You are about to drop the column `change_log` on the `homepage_version` table. All the data in the column will be lost.
  - You are about to drop the column `is_draft` on the `homepage_version` table. All the data in the column will be lost.
  - You are about to drop the column `is_published` on the `homepage_version` table. All the data in the column will be lost.
  - You are about to drop the column `snapshot` on the `homepage_version` table. All the data in the column will be lost.
  - You are about to drop the column `error_count` on the `import_job` table. All the data in the column will be lost.
  - You are about to drop the column `error_details` on the `import_job` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `import_job` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `import_job` table. All the data in the column will be lost.
  - You are about to drop the column `success_count` on the `import_job` table. All the data in the column will be lost.
  - You are about to alter the column `file_size` on the `import_job` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to drop the column `auth_type` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `base_url` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `credential_config` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `health_check_interval_sec` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `health_check_url` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `is_healthy` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `last_health_check_at` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `parent_id` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `rate_limit` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `retry_config` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `timeout_ms` on the `integration_adapter` table. All the data in the column will be lost.
  - You are about to drop the column `adapter_id` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `correlation_id` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `duration_ms` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `error_code` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `response_headers` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `retry_count` on the `integration_log` table. All the data in the column will be lost.
  - You are about to drop the column `webhook_id` on the `integration_log` table. All the data in the column will be lost.
  - You are about to alter the column `method` on the `integration_log` table. The data in that column could be lost. The data in that column will be cast from `VarChar(16)` to `VarChar(10)`.
  - You are about to alter the column `response_status` on the `integration_log` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to drop the column `anonymous_only` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `auto_moderation` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `closed_message` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `custom_css` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `greeting_message` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `max_length` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `min_length` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `rate_limit_window_minutes` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `require_captcha` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `submit_button_text` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `success_message` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `marshmallow_config` table. All the data in the column will be lost.
  - You are about to drop the column `content_hash` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `is_archived` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `is_favorited` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `moderation_flags` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `moderation_reason` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `moderation_status` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `reactions` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `read_at` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `reply_is_public` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `sender_ip_hash` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `sender_nickname` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `sender_ua_hash` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_at` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `turnstile_token` on the `marshmallow_message` table. All the data in the column will be lost.
  - You are about to drop the column `ip_hash` on the `marshmallow_reaction` table. All the data in the column will be lost.
  - You are about to drop the column `reaction_type` on the `marshmallow_reaction` table. All the data in the column will be lost.
  - You are about to drop the column `is_revoked` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_at` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `report_job` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `report_job` table. All the data in the column will be lost.
  - You are about to drop the column `parameters` on the `report_job` table. All the data in the column will be lost.
  - You are about to drop the column `row_count` on the `report_job` table. All the data in the column will be lost.
  - You are about to drop the column `login_attempts` on the `system_user` table. All the data in the column will be lost.
  - You are about to drop the column `canonical_url` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `custom_css` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `meta_description` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `meta_keywords` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `meta_title` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `published_at` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `published_by` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `talent_homepage` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `talent_homepage` table. All the data in the column will be lost.
  - The `theme` column on the `talent_homepage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `context` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `host_name` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `request_id` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `service_name` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `service_version` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `stack_trace` on the `technical_event_log` table. All the data in the column will be lost.
  - You are about to drop the column `failure_count` on the `webhook` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `webhook` table. All the data in the column will be lost.
  - You are about to drop the column `retry_config` on the `webhook` table. All the data in the column will be lost.
  - You are about to drop the column `secret_hash` on the `webhook` table. All the data in the column will be lost.
  - You are about to alter the column `last_status` on the `webhook` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to drop the `homepage_component` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[owner_type,owner_id,code]` on the table `integration_adapter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[message_id,fingerprint_hash,reaction]` on the table `marshmallow_reaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[custom_domain]` on the table `talent_homepage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `webhook` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `object_id` to the `change_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `object_type` to the `change_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `homepage_version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `homepage_version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `homepage_version` table without a default value. This is not possible if the table is not empty.
  - Made the column `file_name` on table `import_job` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_rows` on table `import_job` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `owner_type` to the `integration_adapter` table without a default value. This is not possible if the table is not empty.
  - Made the column `platform_id` on table `integration_adapter` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endpoint` on table `integration_log` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `fingerprint_hash` to the `marshmallow_reaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reaction` to the `marshmallow_reaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `sort_order` on table `profile_store` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `filter_criteria` to the `report_job` table without a default value. This is not possible if the table is not empty.
  - Made the column `talent_id` on table `report_job` required. This step will fail if there are existing NULL values in that column.
  - Made the column `profile_store_id` on table `report_job` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `code` to the `webhook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_en` to the `webhook` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."system_dictionary_item" DROP CONSTRAINT "system_dictionary_item_dictionary_code_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."change_log" DROP CONSTRAINT "change_log_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."consent_agreement" DROP CONSTRAINT "consent_agreement_consent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."consent_agreement" DROP CONSTRAINT "consent_agreement_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_access_log" DROP CONSTRAINT "customer_access_log_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_access_log" DROP CONSTRAINT "customer_access_log_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_access_log" DROP CONSTRAINT "customer_access_log_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_access_log" DROP CONSTRAINT "customer_access_log_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_company_info" DROP CONSTRAINT "customer_company_info_business_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_company_info" DROP CONSTRAINT "customer_company_info_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_external_id" DROP CONSTRAINT "customer_external_id_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_external_id" DROP CONSTRAINT "customer_external_id_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_external_id" DROP CONSTRAINT "customer_external_id_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_inactivation_reason_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_last_modified_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_origin_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_status_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."customer_profile" DROP CONSTRAINT "customer_profile_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."delegated_admin" DROP CONSTRAINT "delegated_admin_admin_role_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."delegated_admin" DROP CONSTRAINT "delegated_admin_admin_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."delegated_admin" DROP CONSTRAINT "delegated_admin_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."homepage_component" DROP CONSTRAINT "homepage_component_homepage_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."homepage_version" DROP CONSTRAINT "homepage_version_homepage_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."import_job" DROP CONSTRAINT "import_job_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."import_job" DROP CONSTRAINT "import_job_created_by_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."import_job" DROP CONSTRAINT "import_job_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."import_job" DROP CONSTRAINT "import_job_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."inactivation_reason" DROP CONSTRAINT "inactivation_reason_reason_category_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."integration_adapter" DROP CONSTRAINT "integration_adapter_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."integration_adapter" DROP CONSTRAINT "integration_adapter_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."marshmallow_config" DROP CONSTRAINT "marshmallow_config_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."marshmallow_message" DROP CONSTRAINT "marshmallow_message_config_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."marshmallow_message" DROP CONSTRAINT "marshmallow_message_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."marshmallow_reaction" DROP CONSTRAINT "marshmallow_reaction_message_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_level" DROP CONSTRAINT "membership_level_membership_type_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_record" DROP CONSTRAINT "membership_record_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_record" DROP CONSTRAINT "membership_record_membership_class_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_record" DROP CONSTRAINT "membership_record_membership_level_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_record" DROP CONSTRAINT "membership_record_membership_type_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_record" DROP CONSTRAINT "membership_record_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."membership_type" DROP CONSTRAINT "membership_type_membership_class_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."platform_identity" DROP CONSTRAINT "platform_identity_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."platform_identity" DROP CONSTRAINT "platform_identity_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."platform_identity_history" DROP CONSTRAINT "platform_identity_history_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."platform_identity_history" DROP CONSTRAINT "platform_identity_history_identity_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."policy" DROP CONSTRAINT "policy_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."profile_store" DROP CONSTRAINT "profile_store_pii_service_config_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."recovery_code" DROP CONSTRAINT "recovery_code_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."refresh_token" DROP CONSTRAINT "refresh_token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."report_job" DROP CONSTRAINT "report_job_created_by_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."report_job" DROP CONSTRAINT "report_job_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."report_job" DROP CONSTRAINT "report_job_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."role_policy" DROP CONSTRAINT "role_policy_policy_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."role_policy" DROP CONSTRAINT "role_policy_role_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."subsidiary" DROP CONSTRAINT "subsidiary_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."talent" DROP CONSTRAINT "talent_profile_store_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."talent" DROP CONSTRAINT "talent_subsidiary_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."talent_homepage" DROP CONSTRAINT "talent_homepage_talent_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."user_role" DROP CONSTRAINT "user_role_role_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template"."user_role" DROP CONSTRAINT "user_role_user_id_fkey";

-- DropIndex
DROP INDEX "public"."idx_system_dictionary_item_extra_data";

-- DropIndex
DROP INDEX "tenant_template"."idx_blocklist_entry_scope";

-- DropIndex
DROP INDEX "tenant_template"."idx_change_log_entity";

-- DropIndex
DROP INDEX "tenant_template"."idx_customer_profile_tags";

-- DropIndex
DROP INDEX "tenant_template"."idx_homepage_version_homepage_id";

-- DropIndex
DROP INDEX "tenant_template"."idx_homepage_version_is_published";

-- DropIndex
DROP INDEX "tenant_template"."idx_integration_adapter_is_active";

-- DropIndex
DROP INDEX "tenant_template"."idx_integration_adapter_parent_id";

-- DropIndex
DROP INDEX "tenant_template"."idx_integration_adapter_platform_id";

-- DropIndex
ALTER TABLE "tenant_template"."integration_adapter" DROP CONSTRAINT IF EXISTS "integration_adapter_code_key";
DROP INDEX IF EXISTS "tenant_template"."integration_adapter_code_key";

-- DropIndex
DROP INDEX "tenant_template"."idx_integration_log_adapter_id";

-- DropIndex
DROP INDEX "tenant_template"."idx_integration_log_direction";

-- DropIndex
DROP INDEX "tenant_template"."idx_ip_access_rule_is_active";

-- DropIndex
DROP INDEX "tenant_template"."idx_marshmallow_message_content_hash";

-- DropIndex
DROP INDEX "tenant_template"."idx_marshmallow_message_is_favorited";

-- DropIndex
DROP INDEX "tenant_template"."idx_marshmallow_message_is_read";

-- DropIndex
DROP INDEX "tenant_template"."idx_marshmallow_message_status";

-- DropIndex
DROP INDEX "tenant_template"."idx_marshmallow_message_submitted_at";

-- DropIndex
ALTER TABLE "tenant_template"."marshmallow_reaction" DROP CONSTRAINT IF EXISTS "marshmallow_reaction_message_id_reaction_type_ip_hash_key";
DROP INDEX IF EXISTS "tenant_template"."marshmallow_reaction_message_id_reaction_type_ip_hash_key";

-- DropIndex
DROP INDEX "tenant_template"."idx_refresh_token_token_hash";

-- DropIndex
DROP INDEX "tenant_template"."idx_technical_event_log_severity";

-- DropIndex
DROP INDEX "tenant_template"."idx_webhook_events";

-- DropIndex
DROP INDEX "tenant_template"."idx_webhook_is_active";

-- AlterTable
ALTER TABLE "public"."global_config" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."system_dictionary" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."system_dictionary_item" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."tenant" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."address_type" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."blocklist_entry" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."business_segment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."change_log" DROP COLUMN "changes",
DROP COLUMN "entity_id",
DROP COLUMN "entity_type",
ADD COLUMN     "diff" JSONB,
ADD COLUMN     "object_id" UUID NOT NULL,
ADD COLUMN     "object_name" VARCHAR(255),
ADD COLUMN     "object_type" VARCHAR(64) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "action" SET DATA TYPE VARCHAR(32);

-- AlterTable
ALTER TABLE "tenant_template"."communication_type" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."consent" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."consent_agreement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."consumer" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."customer_access_log" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."customer_company_info" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."customer_external_id" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."customer_profile" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."customer_status" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."delegated_admin" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."homepage_version" DROP COLUMN "change_log",
DROP COLUMN "is_draft",
DROP COLUMN "is_published",
DROP COLUMN "snapshot",
ADD COLUMN     "archived_at" TIMESTAMPTZ,
ADD COLUMN     "content" JSONB NOT NULL,
ADD COLUMN     "content_hash" VARCHAR(64),
ADD COLUMN     "status" VARCHAR(16) NOT NULL,
ADD COLUMN     "theme" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_template"."import_job" DROP COLUMN "error_count",
DROP COLUMN "error_details",
DROP COLUMN "file_url",
DROP COLUMN "options",
DROP COLUMN "success_count",
ADD COLUMN     "failed_rows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "success_rows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warning_rows" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "file_name" SET NOT NULL,
ALTER COLUMN "file_size" SET DATA TYPE INTEGER,
ALTER COLUMN "total_rows" SET NOT NULL,
ALTER COLUMN "total_rows" SET DEFAULT 0,
ALTER COLUMN "created_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_template"."inactivation_reason" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."integration_adapter" DROP COLUMN "auth_type",
DROP COLUMN "base_url",
DROP COLUMN "credential_config",
DROP COLUMN "health_check_interval_sec",
DROP COLUMN "health_check_url",
DROP COLUMN "is_healthy",
DROP COLUMN "last_health_check_at",
DROP COLUMN "parent_id",
DROP COLUMN "rate_limit",
DROP COLUMN "retry_config",
DROP COLUMN "timeout_ms",
ADD COLUMN     "inherit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "owner_id" UUID,
ADD COLUMN     "owner_type" VARCHAR(16) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "platform_id" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."integration_log" DROP COLUMN "adapter_id",
DROP COLUMN "correlation_id",
DROP COLUMN "duration_ms",
DROP COLUMN "error_code",
DROP COLUMN "response_headers",
DROP COLUMN "retry_count",
DROP COLUMN "webhook_id",
ADD COLUMN     "consumer_code" VARCHAR(32),
ADD COLUMN     "latency_ms" INTEGER,
ADD COLUMN     "trace_id" VARCHAR(64),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "endpoint" SET NOT NULL,
ALTER COLUMN "method" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "response_status" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "tenant_template"."ip_access_rule" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."marshmallow_config" DROP COLUMN "anonymous_only",
DROP COLUMN "auto_moderation",
DROP COLUMN "closed_message",
DROP COLUMN "created_by",
DROP COLUMN "custom_css",
DROP COLUMN "greeting_message",
DROP COLUMN "max_length",
DROP COLUMN "min_length",
DROP COLUMN "rate_limit_window_minutes",
DROP COLUMN "require_captcha",
DROP COLUMN "settings",
DROP COLUMN "submit_button_text",
DROP COLUMN "success_message",
DROP COLUMN "updated_by",
ADD COLUMN     "allow_anonymous" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowed_reactions" VARCHAR(32)[] DEFAULT ARRAY['❤️', '👍', '😊', '🎉', '💯']::VARCHAR(32)[],
ADD COLUMN     "auto_approve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captcha_mode" VARCHAR(16) NOT NULL DEFAULT 'auto',
ADD COLUMN     "external_blocklist_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_message_length" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "min_message_length" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "moderation_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profanity_filter_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rate_limit_window_hours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reactions_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "thank_you_text" TEXT,
ADD COLUMN     "theme" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "title" VARCHAR(128),
ADD COLUMN     "welcome_text" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."marshmallow_message" DROP COLUMN "content_hash",
DROP COLUMN "is_archived",
DROP COLUMN "is_favorited",
DROP COLUMN "moderation_flags",
DROP COLUMN "moderation_reason",
DROP COLUMN "moderation_status",
DROP COLUMN "reactions",
DROP COLUMN "read_at",
DROP COLUMN "reply_is_public",
DROP COLUMN "sender_ip_hash",
DROP COLUMN "sender_nickname",
DROP COLUMN "sender_ua_hash",
DROP COLUMN "submitted_at",
DROP COLUMN "turnstile_token",
ADD COLUMN     "fingerprint_hash" VARCHAR(64),
ADD COLUMN     "ip_address" INET,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_starred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profanity_flags" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
ADD COLUMN     "reaction_counts" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "rejection_note" VARCHAR(255),
ADD COLUMN     "rejection_reason" VARCHAR(32),
ADD COLUMN     "replied_by" UUID,
ADD COLUMN     "sender_name" VARCHAR(64),
ADD COLUMN     "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_anonymous" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."marshmallow_reaction" DROP COLUMN "ip_hash",
DROP COLUMN "reaction_type",
ADD COLUMN     "fingerprint_hash" VARCHAR(64) NOT NULL,
ADD COLUMN     "ip_address" INET,
ADD COLUMN     "reaction" VARCHAR(32) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."membership_class" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."membership_level" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."membership_record" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."membership_type" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."pii_service_config" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."platform_identity" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."platform_identity_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."policy" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."profile_store" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "sort_order" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenant_template"."reason_category" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."recovery_code" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."refresh_token" DROP COLUMN "is_revoked",
DROP COLUMN "last_used_at",
DROP COLUMN "user_agent",
ADD COLUMN     "device_info" VARCHAR(255),
ADD COLUMN     "revoked_at" TIMESTAMPTZ,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."report_job" DROP COLUMN "file_size",
DROP COLUMN "file_url",
DROP COLUMN "parameters",
DROP COLUMN "row_count",
ADD COLUMN     "downloaded_at" TIMESTAMPTZ,
ADD COLUMN     "error_code" VARCHAR(64),
ADD COLUMN     "file_path" VARCHAR(512),
ADD COLUMN     "file_size_bytes" BIGINT,
ADD COLUMN     "filter_criteria" JSONB NOT NULL,
ADD COLUMN     "format" VARCHAR(16) NOT NULL DEFAULT 'xlsx',
ADD COLUMN     "max_retries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "processed_rows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress_percentage" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "queued_at" TIMESTAMPTZ,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_rows" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "talent_id" SET NOT NULL,
ALTER COLUMN "profile_store_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenant_template"."resource" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."role" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."role_policy" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."social_platform" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."subsidiary" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."system_user" DROP COLUMN "login_attempts",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."talent" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."talent_homepage" DROP COLUMN "canonical_url",
DROP COLUMN "created_by",
DROP COLUMN "custom_css",
DROP COLUMN "meta_description",
DROP COLUMN "meta_keywords",
DROP COLUMN "meta_title",
DROP COLUMN "published_at",
DROP COLUMN "published_by",
DROP COLUMN "settings",
DROP COLUMN "updated_by",
ADD COLUMN     "analytics_id" VARCHAR(64),
ADD COLUMN     "custom_domain" VARCHAR(255),
ADD COLUMN     "custom_domain_verification_token" VARCHAR(64),
ADD COLUMN     "custom_domain_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "draft_version_id" UUID,
ADD COLUMN     "published_version_id" UUID,
ADD COLUMN     "seo_description" VARCHAR(512),
ADD COLUMN     "seo_title" VARCHAR(128),
ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "theme",
ADD COLUMN     "theme" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."technical_event_log" DROP COLUMN "context",
DROP COLUMN "host_name",
DROP COLUMN "request_id",
DROP COLUMN "service_name",
DROP COLUMN "service_version",
DROP COLUMN "stack_trace",
ADD COLUMN     "error_code" VARCHAR(32),
ADD COLUMN     "error_stack" TEXT,
ADD COLUMN     "payload_json" JSONB,
ADD COLUMN     "scope" VARCHAR(32) NOT NULL DEFAULT 'general',
ADD COLUMN     "source" VARCHAR(64),
ADD COLUMN     "span_id" VARCHAR(32),
ADD COLUMN     "trace_id" VARCHAR(64),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "message" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_template"."user_role" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_template"."webhook" DROP COLUMN "failure_count",
DROP COLUMN "name",
DROP COLUMN "retry_config",
DROP COLUMN "secret_hash",
ADD COLUMN     "code" VARCHAR(32) NOT NULL,
ADD COLUMN     "consecutive_failures" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "disabled_at" TIMESTAMPTZ,
ADD COLUMN     "name_en" VARCHAR(255) NOT NULL,
ADD COLUMN     "name_ja" VARCHAR(255),
ADD COLUMN     "name_zh" VARCHAR(255),
ADD COLUMN     "retry_policy" JSONB NOT NULL DEFAULT '{"max_retries": 3, "backoff_ms": 1000}',
ADD COLUMN     "secret" VARCHAR(255),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "events" DROP DEFAULT,
ALTER COLUMN "last_status" SET DATA TYPE SMALLINT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "tenant_template"."homepage_component";

-- CreateTable
CREATE TABLE "tenant_template"."external_blocklist_pattern" (
    "id" UUID NOT NULL,
    "owner_type" VARCHAR(16) NOT NULL,
    "owner_id" UUID,
    "pattern" VARCHAR(512) NOT NULL,
    "pattern_type" VARCHAR(16) NOT NULL DEFAULT 'domain',
    "name_en" VARCHAR(128) NOT NULL,
    "name_zh" VARCHAR(128),
    "name_ja" VARCHAR(128),
    "description" TEXT,
    "category" VARCHAR(64),
    "severity" VARCHAR(16) NOT NULL DEFAULT 'medium',
    "action" VARCHAR(16) NOT NULL DEFAULT 'reject',
    "replacement" VARCHAR(255) NOT NULL DEFAULT '[链接已移除]',
    "inherit" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "external_blocklist_pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."config_override" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "owner_type" VARCHAR(16) NOT NULL,
    "owner_id" UUID,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "config_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."import_job_error" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "error_code" VARCHAR(64) NOT NULL,
    "error_message" TEXT NOT NULL,
    "original_data" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_job_error_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."adapter_config" (
    "id" UUID NOT NULL,
    "adapter_id" UUID NOT NULL,
    "config_key" VARCHAR(64) NOT NULL,
    "config_value" TEXT NOT NULL,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "adapter_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_blocklist_pattern_owner_type_owner_id_idx" ON "tenant_template"."external_blocklist_pattern"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "external_blocklist_pattern_is_active_idx" ON "tenant_template"."external_blocklist_pattern"("is_active");

-- CreateIndex
CREATE INDEX "external_blocklist_pattern_category_idx" ON "tenant_template"."external_blocklist_pattern"("category");

-- CreateIndex
CREATE INDEX "config_override_entity_type_owner_type_owner_id_idx" ON "tenant_template"."config_override"("entity_type", "owner_type", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_override_entity_type_entity_id_owner_type_owner_id_key" ON "tenant_template"."config_override"("entity_type", "entity_id", "owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "import_job_error_import_job_id_idx" ON "tenant_template"."import_job_error"("import_job_id");

-- CreateIndex
CREATE INDEX "import_job_error_row_number_idx" ON "tenant_template"."import_job_error"("row_number");

-- CreateIndex
CREATE UNIQUE INDEX "adapter_config_adapter_id_config_key_key" ON "tenant_template"."adapter_config"("adapter_id", "config_key");

-- CreateIndex
CREATE INDEX "blocklist_entry_scope_idx" ON "tenant_template"."blocklist_entry"("scope");

-- CreateIndex
CREATE INDEX "change_log_object_type_object_id_idx" ON "tenant_template"."change_log"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "change_log_request_id_idx" ON "tenant_template"."change_log"("request_id");

-- CreateIndex
CREATE INDEX "customer_profile_tags_idx" ON "tenant_template"."customer_profile"("tags");

-- CreateIndex
CREATE INDEX "homepage_version_homepage_id_status_idx" ON "tenant_template"."homepage_version"("homepage_id", "status");

-- CreateIndex
CREATE INDEX "import_job_profile_store_id_idx" ON "tenant_template"."import_job"("profile_store_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_adapter_owner_type_owner_id_code_key" ON "tenant_template"."integration_adapter"("owner_type", "owner_id", "code");

-- CreateIndex
CREATE INDEX "integration_log_trace_id_idx" ON "tenant_template"."integration_log"("trace_id");

-- CreateIndex
CREATE INDEX "marshmallow_message_config_id_status_idx" ON "tenant_template"."marshmallow_message"("config_id", "status");

-- CreateIndex
CREATE INDEX "marshmallow_message_created_at_idx" ON "tenant_template"."marshmallow_message"("created_at");

-- CreateIndex
CREATE INDEX "marshmallow_message_talent_id_is_starred_idx" ON "tenant_template"."marshmallow_message"("talent_id", "is_starred");

-- CreateIndex
CREATE INDEX "marshmallow_message_talent_id_is_pinned_idx" ON "tenant_template"."marshmallow_message"("talent_id", "is_pinned");

-- CreateIndex
CREATE INDEX "marshmallow_message_talent_id_status_idx" ON "tenant_template"."marshmallow_message"("talent_id", "status");

-- CreateIndex
CREATE INDEX "marshmallow_reaction_fingerprint_hash_idx" ON "tenant_template"."marshmallow_reaction"("fingerprint_hash");

-- CreateIndex
CREATE UNIQUE INDEX "marshmallow_reaction_message_id_fingerprint_hash_reaction_key" ON "tenant_template"."marshmallow_reaction"("message_id", "fingerprint_hash", "reaction");

-- CreateIndex
CREATE UNIQUE INDEX "talent_homepage_custom_domain_key" ON "tenant_template"."talent_homepage"("custom_domain");

-- CreateIndex
CREATE INDEX "technical_event_log_scope_idx" ON "tenant_template"."technical_event_log"("scope");

-- CreateIndex
CREATE INDEX "technical_event_log_trace_id_idx" ON "tenant_template"."technical_event_log"("trace_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_code_key" ON "tenant_template"."webhook"("code");

-- AddForeignKey
ALTER TABLE "public"."system_dictionary_item" ADD CONSTRAINT "system_dictionary_item_dictionary_code_fkey" FOREIGN KEY ("dictionary_code") REFERENCES "public"."system_dictionary"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."subsidiary" ADD CONSTRAINT "subsidiary_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenant_template"."subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."talent" ADD CONSTRAINT "talent_subsidiary_id_fkey" FOREIGN KEY ("subsidiary_id") REFERENCES "tenant_template"."subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."talent" ADD CONSTRAINT "talent_profile_store_id_fkey" FOREIGN KEY ("profile_store_id") REFERENCES "tenant_template"."profile_store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."recovery_code" ADD CONSTRAINT "recovery_code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."policy" ADD CONSTRAINT "policy_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "tenant_template"."resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."role_policy" ADD CONSTRAINT "role_policy_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tenant_template"."role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."role_policy" ADD CONSTRAINT "role_policy_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "tenant_template"."policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tenant_template"."role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."delegated_admin" ADD CONSTRAINT "delegated_admin_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."delegated_admin" ADD CONSTRAINT "delegated_admin_admin_role_id_fkey" FOREIGN KEY ("admin_role_id") REFERENCES "tenant_template"."role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."delegated_admin" ADD CONSTRAINT "delegated_admin_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "tenant_template"."system_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."profile_store" ADD CONSTRAINT "profile_store_pii_service_config_id_fkey" FOREIGN KEY ("pii_service_config_id") REFERENCES "tenant_template"."pii_service_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_profile_store_id_fkey" FOREIGN KEY ("profile_store_id") REFERENCES "tenant_template"."profile_store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_origin_talent_id_fkey" FOREIGN KEY ("origin_talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_last_modified_talent_id_fkey" FOREIGN KEY ("last_modified_talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "tenant_template"."customer_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_profile" ADD CONSTRAINT "customer_profile_inactivation_reason_id_fkey" FOREIGN KEY ("inactivation_reason_id") REFERENCES "tenant_template"."inactivation_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_company_info" ADD CONSTRAINT "customer_company_info_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_company_info" ADD CONSTRAINT "customer_company_info_business_segment_id_fkey" FOREIGN KEY ("business_segment_id") REFERENCES "tenant_template"."business_segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_external_id" ADD CONSTRAINT "customer_external_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_external_id" ADD CONSTRAINT "customer_external_id_profile_store_id_fkey" FOREIGN KEY ("profile_store_id") REFERENCES "tenant_template"."profile_store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_external_id" ADD CONSTRAINT "customer_external_id_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "tenant_template"."consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_access_log" ADD CONSTRAINT "customer_access_log_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_access_log" ADD CONSTRAINT "customer_access_log_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_access_log" ADD CONSTRAINT "customer_access_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."platform_identity" ADD CONSTRAINT "platform_identity_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."platform_identity" ADD CONSTRAINT "platform_identity_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "tenant_template"."social_platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."platform_identity_history" ADD CONSTRAINT "platform_identity_history_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "tenant_template"."platform_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."platform_identity_history" ADD CONSTRAINT "platform_identity_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_record" ADD CONSTRAINT "membership_record_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_record" ADD CONSTRAINT "membership_record_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "tenant_template"."social_platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_record" ADD CONSTRAINT "membership_record_membership_class_id_fkey" FOREIGN KEY ("membership_class_id") REFERENCES "tenant_template"."membership_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_record" ADD CONSTRAINT "membership_record_membership_type_id_fkey" FOREIGN KEY ("membership_type_id") REFERENCES "tenant_template"."membership_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_record" ADD CONSTRAINT "membership_record_membership_level_id_fkey" FOREIGN KEY ("membership_level_id") REFERENCES "tenant_template"."membership_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."consent_agreement" ADD CONSTRAINT "consent_agreement_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."consent_agreement" ADD CONSTRAINT "consent_agreement_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "tenant_template"."consent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."inactivation_reason" ADD CONSTRAINT "inactivation_reason_reason_category_id_fkey" FOREIGN KEY ("reason_category_id") REFERENCES "tenant_template"."reason_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_type" ADD CONSTRAINT "membership_type_membership_class_id_fkey" FOREIGN KEY ("membership_class_id") REFERENCES "tenant_template"."membership_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."membership_level" ADD CONSTRAINT "membership_level_membership_type_id_fkey" FOREIGN KEY ("membership_type_id") REFERENCES "tenant_template"."membership_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."change_log" ADD CONSTRAINT "change_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."integration_log" ADD CONSTRAINT "integration_log_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "tenant_template"."consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."talent_homepage" ADD CONSTRAINT "talent_homepage_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."homepage_version" ADD CONSTRAINT "homepage_version_homepage_id_fkey" FOREIGN KEY ("homepage_id") REFERENCES "tenant_template"."talent_homepage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."marshmallow_config" ADD CONSTRAINT "marshmallow_config_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."marshmallow_message" ADD CONSTRAINT "marshmallow_message_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "tenant_template"."marshmallow_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."marshmallow_message" ADD CONSTRAINT "marshmallow_message_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."marshmallow_reaction" ADD CONSTRAINT "marshmallow_reaction_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "tenant_template"."marshmallow_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."import_job" ADD CONSTRAINT "import_job_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."import_job" ADD CONSTRAINT "import_job_profile_store_id_fkey" FOREIGN KEY ("profile_store_id") REFERENCES "tenant_template"."profile_store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."import_job" ADD CONSTRAINT "import_job_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "tenant_template"."consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."import_job" ADD CONSTRAINT "import_job_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "tenant_template"."system_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."import_job_error" ADD CONSTRAINT "import_job_error_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "tenant_template"."import_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."report_job" ADD CONSTRAINT "report_job_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "tenant_template"."talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."report_job" ADD CONSTRAINT "report_job_profile_store_id_fkey" FOREIGN KEY ("profile_store_id") REFERENCES "tenant_template"."profile_store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."report_job" ADD CONSTRAINT "report_job_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "tenant_template"."system_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."integration_adapter" ADD CONSTRAINT "integration_adapter_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "tenant_template"."social_platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."adapter_config" ADD CONSTRAINT "adapter_config_adapter_id_fkey" FOREIGN KEY ("adapter_id") REFERENCES "tenant_template"."integration_adapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tenant_template"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."idx_system_dictionary_code" RENAME TO "system_dictionary_code_idx";

-- RenameIndex
ALTER INDEX "public"."idx_system_dictionary_is_active" RENAME TO "system_dictionary_is_active_idx";

-- RenameIndex
ALTER INDEX "public"."idx_system_dictionary_item_code" RENAME TO "system_dictionary_item_code_idx";

-- RenameIndex
ALTER INDEX "public"."idx_system_dictionary_item_dictionary_code" RENAME TO "system_dictionary_item_dictionary_code_idx";

-- RenameIndex
ALTER INDEX "public"."idx_system_dictionary_item_is_active" RENAME TO "system_dictionary_item_is_active_idx";

-- RenameIndex
ALTER INDEX "public"."idx_tenant_code" RENAME TO "tenant_code_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_blocklist_entry_category" RENAME TO "blocklist_entry_category_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_blocklist_entry_is_active" RENAME TO "blocklist_entry_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_blocklist_entry_owner" RENAME TO "blocklist_entry_owner_type_owner_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_change_log_occurred_at" RENAME TO "change_log_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_change_log_operator_id" RENAME TO "change_log_operator_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_consent_agreement_consent_id" RENAME TO "consent_agreement_consent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_consent_agreement_customer_id" RENAME TO "consent_agreement_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_access_log_action" RENAME TO "customer_access_log_action_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_access_log_customer_id" RENAME TO "customer_access_log_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_access_log_occurred_at" RENAME TO "customer_access_log_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_access_log_profile_store_id" RENAME TO "customer_access_log_profile_store_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_access_log_talent_id" RENAME TO "customer_access_log_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_external_id_customer_id" RENAME TO "customer_external_id_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_external_id_profile_store_id" RENAME TO "customer_external_id_profile_store_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_origin_talent_id" RENAME TO "customer_profile_origin_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_profile_store_id" RENAME TO "customer_profile_profile_store_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_profile_store_is_active" RENAME TO "customer_profile_profile_store_id_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_profile_type" RENAME TO "customer_profile_profile_type_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_status_id" RENAME TO "customer_profile_status_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_customer_profile_talent_id" RENAME TO "customer_profile_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_import_job_created_at" RENAME TO "import_job_created_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_import_job_status" RENAME TO "import_job_status_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_import_job_talent_id" RENAME TO "import_job_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_integration_log_consumer_id" RENAME TO "integration_log_consumer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_integration_log_occurred_at" RENAME TO "integration_log_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_integration_log_response_status" RENAME TO "integration_log_response_status_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_ip_access_rule_expires_at" RENAME TO "ip_access_rule_expires_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_ip_access_rule_rule_type" RENAME TO "ip_access_rule_rule_type_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_ip_access_rule_scope" RENAME TO "ip_access_rule_scope_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_marshmallow_message_config_id" RENAME TO "marshmallow_message_config_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_marshmallow_message_talent_id" RENAME TO "marshmallow_message_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_marshmallow_reaction_message_id" RENAME TO "marshmallow_reaction_message_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_membership_record_auto_renew" RENAME TO "membership_record_auto_renew_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_membership_record_customer_id" RENAME TO "membership_record_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_membership_record_platform_id" RENAME TO "membership_record_platform_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_membership_record_valid_from_to" RENAME TO "membership_record_valid_from_valid_to_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_membership_record_valid_to" RENAME TO "membership_record_valid_to_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_pii_service_config_is_active" RENAME TO "pii_service_config_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_pii_service_config_is_healthy" RENAME TO "pii_service_config_is_healthy_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_customer_current" RENAME TO "platform_identity_customer_id_is_current_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_customer_id" RENAME TO "platform_identity_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_platform_uid" RENAME TO "platform_identity_platform_id_platform_uid_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_history_captured_at" RENAME TO "platform_identity_history_captured_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_history_customer_id" RENAME TO "platform_identity_history_customer_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_platform_identity_history_identity_id" RENAME TO "platform_identity_history_identity_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_profile_store_is_active" RENAME TO "profile_store_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_profile_store_pii_service_config_id" RENAME TO "profile_store_pii_service_config_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_recovery_code_user_id" RENAME TO "recovery_code_user_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_recovery_code_user_id_is_used" RENAME TO "recovery_code_user_id_is_used_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_refresh_token_expires_at" RENAME TO "refresh_token_expires_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_refresh_token_user_id" RENAME TO "refresh_token_user_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_report_job_created_at" RENAME TO "report_job_created_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_report_job_expires_at" RENAME TO "report_job_expires_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_report_job_report_type" RENAME TO "report_job_report_type_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_report_job_status" RENAME TO "report_job_status_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_report_job_talent_id" RENAME TO "report_job_talent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_subsidiary_is_active" RENAME TO "subsidiary_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_subsidiary_parent_id" RENAME TO "subsidiary_parent_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_subsidiary_path" RENAME TO "subsidiary_path_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_system_user_email" RENAME TO "system_user_email_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_system_user_is_active" RENAME TO "system_user_is_active_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_talent_homepage_path" RENAME TO "talent_homepage_path_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_talent_path" RENAME TO "talent_path_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_talent_profile_store_id" RENAME TO "talent_profile_store_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_talent_subsidiary_id" RENAME TO "talent_subsidiary_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_technical_event_log_event_type" RENAME TO "technical_event_log_event_type_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_technical_event_log_occurred_at" RENAME TO "technical_event_log_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_user_role_scope" RENAME TO "user_role_scope_type_scope_id_idx";

-- RenameIndex
ALTER INDEX "tenant_template"."idx_user_role_user_id" RENAME TO "user_role_user_id_idx";
