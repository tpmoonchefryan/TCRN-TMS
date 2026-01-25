// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Homepage Configuration - Creates homepage configs and versions for testing

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';
import { UatOrganizationResult } from './21-uat-organization';

// Default theme configuration matching ThemeConfig interface
const DEFAULT_THEME = {
  preset: 'default',
  colors: {
    primary: '#5599FF',
    accent: '#FF88CC',
    background: '#F5F7FA',
    text: '#1A1A1A',
    text_secondary: '#666666',
  },
  background: {
    type: 'solid',
    value: '#F5F7FA',
  },
  card: {
    background: '#FFFFFF',
    border_radius: 'medium',
    shadow: 'small',
  },
  typography: {
    font_family: 'system',
    heading_weight: 'bold',
  },
};

const CUTE_THEME = {
  preset: 'cute',
  colors: {
    primary: '#FF88CC',
    accent: '#88CCFF',
    background: '#FFF5F8',
    text: '#4A4A4A',
    text_secondary: '#888888',
  },
  background: {
    type: 'solid',
    value: '#FFF5F8',
  },
  card: {
    background: '#FFFFFF',
    border_radius: 'large',
    shadow: 'medium',
  },
  typography: {
    font_family: 'noto-sans',
    heading_weight: 'bold',
  },
};

// Sample homepage content configurations with correct component types and props
const SAMPLE_HOMEPAGE_CONTENT = {
  basic: {
    version: '1.0',
    components: [
      {
        id: 'profile-1',
        type: 'ProfileCard',
        props: {
          avatar_url: '',
          display_name: 'Welcome to my page!',
          bio: 'Thanks for visiting!',
          avatar_shape: 'circle',
          name_font_size: 'large',
          bio_max_lines: 3,
        },
        visible: true,
      },
      {
        id: 'about-1',
        type: 'RichText',
        props: {
          content_html: '<h2>About Me</h2><p>I am a content creator who loves making videos and streaming games!</p>',
          text_align: 'left',
        },
        visible: true,
      },
      {
        id: 'social-1',
        type: 'SocialLinks',
        props: {
          platforms: [
            { platform_code: 'youtube', url: 'https://youtube.com/@example', label: 'YouTube' },
            { platform_code: 'twitter', url: 'https://twitter.com/example', label: 'Twitter' },
          ],
          style: 'icon',
          layout: 'horizontal',
          icon_size: 'medium',
        },
        visible: true,
      },
    ],
  },
  advanced: {
    version: '1.0',
    components: [
      {
        id: 'profile-1',
        type: 'ProfileCard',
        props: {
          avatar_url: '',
          display_name: 'Welcome!',
          bio: 'Streaming & Creating Content',
          avatar_shape: 'circle',
          name_font_size: 'large',
          bio_max_lines: 3,
        },
        visible: true,
      },
      {
        id: 'about-1',
        type: 'RichText',
        props: {
          content_html: '<h2>About Me</h2><p>Content creator, gamer, and music lover. Join me for fun streams and creative content!</p><h3>Stream Schedule</h3><ul><li>Monday 20:00 JST - Gaming Stream</li><li>Wednesday 21:00 JST - Chat & Music</li><li>Saturday 19:00 JST - Special Events</li></ul>',
          text_align: 'left',
        },
        visible: true,
      },
      {
        id: 'gallery-1',
        type: 'ImageGallery',
        props: {
          images: [],
          layout_mode: 'grid',
          columns: 3,
          gap: 'medium',
          show_captions: false,
        },
        visible: true,
      },
      {
        id: 'social-1',
        type: 'SocialLinks',
        props: {
          platforms: [
            { platform_code: 'youtube', url: 'https://youtube.com/@example', label: 'YouTube' },
            { platform_code: 'twitter', url: 'https://twitter.com/example', label: 'Twitter' },
            { platform_code: 'bilibili', url: 'https://space.bilibili.com/123456', label: 'Bilibili' },
            { platform_code: 'discord', url: 'https://discord.gg/example', label: 'Discord' },
          ],
          style: 'pill',
          layout: 'horizontal',
          icon_size: 'medium',
        },
        visible: true,
      },
      {
        id: 'marshmallow-1',
        type: 'MarshmallowWidget',
        props: {
          display_mode: 'full',
          show_recent_count: 3,
          show_submit_button: true,
        },
        visible: true,
      },
    ],
  },
};

export async function seedUatHomepages(
  prisma: PrismaClient,
  uatTenants: UatTenantResult,
  uatOrg: UatOrganizationResult
): Promise<void> {
  console.log('  → Creating UAT homepage configurations...');

  // ==========================================================================
  // UAT_CORP Homepages
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;
  
  const corpTalentConfigs = [
    { code: 'TALENT_SAKURA', published: true, contentType: 'advanced' },
    { code: 'TALENT_LUNA', published: true, contentType: 'basic' },
    { code: 'TALENT_HANA', published: false, contentType: 'basic' }, // Draft only
    { code: 'TALENT_MELODY', published: true, contentType: 'advanced' },
  ];

  for (const config of corpTalentConfigs) {
    const talentId = uatOrg.talents[config.code];
    if (!talentId) continue;

    const content = config.contentType === 'advanced' 
      ? SAMPLE_HOMEPAGE_CONTENT.advanced 
      : SAMPLE_HOMEPAGE_CONTENT.basic;

    // Check if homepage already exists
    const existingHomepage = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${corpSchema}".talent_homepage WHERE talent_id = $1::uuid`,
      talentId
    );

    let homepageId: string;

    if (existingHomepage.length > 0) {
      // Delete existing versions first
      homepageId = existingHomepage[0].id;
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${corpSchema}".homepage_version WHERE homepage_id = $1::uuid`,
        homepageId
      );
      // Update homepage
      await prisma.$executeRawUnsafe(
        `UPDATE "${corpSchema}".talent_homepage SET is_published = $1, draft_version_id = NULL, published_version_id = NULL WHERE id = $2::uuid`,
        config.published, homepageId
      );
    } else {
      // Create homepage
      const homepageResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${corpSchema}".talent_homepage 
         (id, talent_id, is_published, seo_title, seo_description, theme, created_at, updated_at, version)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, now(), now(), 1)
         RETURNING id`,
        talentId,
        config.published,
        `${config.code.replace('TALENT_', '')} - Official Page`,
        `Welcome to the official page of ${config.code.replace('TALENT_', '')}!`,
        JSON.stringify(DEFAULT_THEME)
      );
      homepageId = homepageResult[0].id;
    }

    // Create draft version
    const draftVersionResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".homepage_version 
       (id, homepage_id, version_number, status, content, theme, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1::uuid, 1, 'draft', $2::jsonb, '{}'::jsonb, now(), now(), $3::uuid)
       RETURNING id`,
      homepageId,
      JSON.stringify(content),
      '00000000-0000-0000-0000-000000000001'
    );
    const draftVersionId = draftVersionResult[0].id;

    // Update homepage with draft version
    await prisma.$executeRawUnsafe(
      `UPDATE "${corpSchema}".talent_homepage SET draft_version_id = $1::uuid WHERE id = $2::uuid`,
      draftVersionId, homepageId
    );

    if (config.published) {
      // Update draft to published
      await prisma.$executeRawUnsafe(
        `UPDATE "${corpSchema}".homepage_version 
         SET status = 'published', published_at = now(), published_by = $1::uuid 
         WHERE id = $2::uuid`,
        '00000000-0000-0000-0000-000000000001',
        draftVersionId
      );

      // Update homepage with published version
      await prisma.$executeRawUnsafe(
        `UPDATE "${corpSchema}".talent_homepage SET published_version_id = $1::uuid WHERE id = $2::uuid`,
        draftVersionId, homepageId
      );

      // Create some version history
      for (let v = 2; v <= 3; v++) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${corpSchema}".homepage_version 
           (id, homepage_id, version_number, status, content, theme, archived_at, created_at, updated_at, created_by)
           VALUES (gen_random_uuid(), $1::uuid, $2, 'archived', $3::jsonb, '{}'::jsonb, now() - interval '${v} days', now() - interval '${v} days', now() - interval '${v} days', $4::uuid)`,
          homepageId,
          v,
          JSON.stringify({ ...content, version: v }),
          '00000000-0000-0000-0000-000000000001'
        );
      }
    }
  }

  console.log(`    ✓ Created 4 homepage configurations in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO Homepages
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;
  
  const soloTalentConfigs = [
    { code: 'TALENT_SOLO_STAR', published: true, contentType: 'advanced' },
    { code: 'TALENT_INDIE_CREATOR', published: false, contentType: 'basic' }, // Draft only
  ];

  for (const config of soloTalentConfigs) {
    const talentId = uatOrg.talents[config.code];
    if (!talentId) continue;

    // Use the same content structure for UAT_SOLO
    const content = config.contentType === 'advanced' 
      ? SAMPLE_HOMEPAGE_CONTENT.advanced
      : SAMPLE_HOMEPAGE_CONTENT.basic;

    // Check if homepage already exists
    const existingHomepage = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${soloSchema}".talent_homepage WHERE talent_id = $1::uuid`,
      talentId
    );

    let homepageId: string;

    if (existingHomepage.length > 0) {
      // Delete existing versions first
      homepageId = existingHomepage[0].id;
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${soloSchema}".homepage_version WHERE homepage_id = $1::uuid`,
        homepageId
      );
      // Update homepage
      await prisma.$executeRawUnsafe(
        `UPDATE "${soloSchema}".talent_homepage SET is_published = $1, draft_version_id = NULL, published_version_id = NULL WHERE id = $2::uuid`,
        config.published, homepageId
      );
    } else {
      // Create homepage
      const homepageResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${soloSchema}".talent_homepage 
         (id, talent_id, is_published, seo_title, seo_description, theme, created_at, updated_at, version)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, now(), now(), 1)
         RETURNING id`,
        talentId,
        config.published,
        `${config.code.replace('TALENT_', '')} - 主页`,
        `欢迎来到 ${config.code.replace('TALENT_', '')} 的官方主页！`,
        JSON.stringify(CUTE_THEME)
      );
      homepageId = homepageResult[0].id;
    }

    // Create draft version
    const draftVersionResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${soloSchema}".homepage_version 
       (id, homepage_id, version_number, status, content, theme, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1::uuid, 1, 'draft', $2::jsonb, '{}'::jsonb, now(), now(), $3::uuid)
       RETURNING id`,
      homepageId,
      JSON.stringify(content),
      '00000000-0000-0000-0000-000000000001'
    );
    const draftVersionId = draftVersionResult[0].id;

    await prisma.$executeRawUnsafe(
      `UPDATE "${soloSchema}".talent_homepage SET draft_version_id = $1::uuid WHERE id = $2::uuid`,
      draftVersionId, homepageId
    );

    if (config.published) {
      // Update draft to published
      await prisma.$executeRawUnsafe(
        `UPDATE "${soloSchema}".homepage_version 
         SET status = 'published', published_at = now(), published_by = $1::uuid 
         WHERE id = $2::uuid`,
        '00000000-0000-0000-0000-000000000001',
        draftVersionId
      );

      await prisma.$executeRawUnsafe(
        `UPDATE "${soloSchema}".talent_homepage SET published_version_id = $1::uuid WHERE id = $2::uuid`,
        draftVersionId, homepageId
      );
    }
  }

  console.log(`    ✓ Created 2 homepage configurations in UAT_SOLO`);
}
