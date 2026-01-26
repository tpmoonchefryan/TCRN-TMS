-- AlterTable
ALTER TABLE "tenant_template"."marshmallow_message" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(512);
ALTER TABLE "tenant_template"."marshmallow_message" ADD COLUMN IF NOT EXISTS "image_urls" TEXT[] DEFAULT '{}';
ALTER TABLE "tenant_template"."marshmallow_message" ADD COLUMN IF NOT EXISTS "social_link" VARCHAR(512);
