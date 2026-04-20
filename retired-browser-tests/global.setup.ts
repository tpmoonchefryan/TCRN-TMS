import { createHash, randomUUID } from 'node:crypto';

import type { FullConfig } from '@playwright/test';

import { PrismaClient } from '@tcrn/database';
import {
  DEFAULT_THEME,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
} from '@tcrn/shared';

import { writeWebSmokeFixture } from './fixtures/web-smoke-fixture';

const FIXTURE_PASSWORD = 'TestPassword123!';

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const prisma = new PrismaClient();
  let tenantFixture: Awaited<ReturnType<typeof createTestTenantFixture>> | null = null;

  try {
    tenantFixture = await createTestTenantFixture(prisma, 'web_smoke');

    const standardUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `pw_user_${Date.now()}`,
      ['ADMIN'],
    );

    const displayName = 'Playwright Public Talent';
    const homepagePath = `playwright-public-${Date.now()}`;
    const marshmallowPath = `playwright-marshmallow-${Date.now()}`;
    const marshmallowTitle = 'Ask The Talent';
    const welcomeText = 'Drop a thoughtful question.';

    const talent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_E2E_${Date.now().toString(36).toUpperCase()}`,
      nameEn: displayName,
      displayName,
      homepagePath,
      lifecycleStatus: 'published',
      createdBy: standardUser.id,
      publishedBy: standardUser.id,
    });

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET marshmallow_path = $2, updated_at = now()
        WHERE id = $1::uuid
      `,
      talent.id,
      marshmallowPath,
    );

    const homepageId = randomUUID();
    const homepageVersionId = randomUUID();
    const homepageContent = {
      version: '1.0.0',
      components: [
        {
          id: 'profile-card',
          type: 'ProfileCard',
          visible: true,
          order: 0,
          props: {
            displayName,
            bio: 'Public homepage smoke fixture',
          },
        },
      ],
    };
    const homepageContentHash = createHash('sha256')
      .update(JSON.stringify(homepageContent))
      .digest('hex');

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".talent_homepage
          (
            id,
            talent_id,
            is_published,
            published_version_id,
            theme,
            created_at,
            updated_at,
            version
          )
        VALUES
          ($1::uuid, $2::uuid, true, $3::uuid, $4::jsonb, now(), now(), 1)
      `,
      homepageId,
      talent.id,
      homepageVersionId,
      JSON.stringify(DEFAULT_THEME),
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".homepage_version
          (
            id,
            homepage_id,
            version_number,
            content,
            theme,
            status,
            content_hash,
            created_by,
            published_at,
            published_by,
            created_at,
            updated_at
          )
        VALUES
          (
            $1::uuid,
            $2::uuid,
            1,
            $3::jsonb,
            $4::jsonb,
            'published',
            $5,
            $6::uuid,
            now(),
            $6::uuid,
            now(),
            now()
          )
      `,
      homepageVersionId,
      homepageId,
      JSON.stringify(homepageContent),
      JSON.stringify(DEFAULT_THEME),
      homepageContentHash,
      standardUser.id,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".marshmallow_config
          (
            id,
            talent_id,
            is_enabled,
            title,
            welcome_text,
            placeholder_text,
            thank_you_text,
            allow_anonymous,
            captcha_mode,
            moderation_enabled,
            auto_approve,
            profanity_filter_enabled,
            external_blocklist_enabled,
            max_message_length,
            min_message_length,
            rate_limit_per_ip,
            rate_limit_window_hours,
            reactions_enabled,
            allowed_reactions,
            theme,
            avatar_url,
            terms_content_en,
            terms_content_zh,
            terms_content_ja,
            privacy_content_en,
            privacy_content_zh,
            privacy_content_ja,
            version,
            created_at,
            updated_at
          )
        VALUES
          (
            gen_random_uuid(),
            $1::uuid,
            true,
            $2,
            $3,
            $4,
            $5,
            true,
            'never',
            false,
            true,
            false,
            false,
            500,
            5,
            1,
            1,
            false,
            ARRAY[]::text[],
            $6::jsonb,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            1,
            now(),
            now()
          )
      `,
      talent.id,
      marshmallowTitle,
      welcomeText,
      'Type your question here',
      'Question received.',
      JSON.stringify({}),
    );

    await writeWebSmokeFixture({
      tenantId: tenantFixture.tenant.id,
      tenantCode: tenantFixture.tenant.code,
      schemaName: tenantFixture.schemaName,
      public: {
        displayName,
        homepagePath,
        marshmallowPath,
        marshmallowTitle,
        welcomeText,
      },
      users: {
        standard: {
          username: standardUser.username,
          password: FIXTURE_PASSWORD,
        },
      },
    });
  } catch (error) {
    await tenantFixture?.cleanup().catch(() => undefined);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
