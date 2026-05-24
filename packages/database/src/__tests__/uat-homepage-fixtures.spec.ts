// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HOMEPAGE_COMPONENT_TYPES, HomepageContentSchema, ThemeConfigSchema } from '@tcrn/shared';

import { UAT_HOMEPAGE_FIXTURES } from '../domains/homepage/uat-homepage-fixtures';

describe('UAT homepage fixtures', () => {
  it('keeps the canonical published fixture aligned with the shared homepage contract', () => {
    const fixture = UAT_HOMEPAGE_FIXTURES.allComponentsPublished;

    assert.deepEqual(HomepageContentSchema.parse(fixture.content), fixture.content);
    assert.deepEqual(ThemeConfigSchema.parse(fixture.theme), fixture.theme);
    assert.equal(fixture.seoTitle, 'Sakura Ch. - Acceptance Fixture');
    assert.equal(
      fixture.seoDescription,
      'Canonical all-components published homepage fixture for acceptance reruns.'
    );
  });

  it('covers every currently supported homepage component type with representative data', () => {
    const fixture = UAT_HOMEPAGE_FIXTURES.allComponentsPublished;
    const typeSet = new Set(fixture.content.components.map((component) => component.type));

    assert.deepEqual([...typeSet].sort(), [...HOMEPAGE_COMPONENT_TYPES].sort());

    const byType = Object.fromEntries(
      fixture.content.components.map((component) => [component.type, component])
    ) as Record<
      (typeof HOMEPAGE_COMPONENT_TYPES)[number],
      (typeof fixture.content.components)[number]
    >;

    assert.equal(byType.ProfileCard.props.displayName, 'Sakura Ch.');
    assert.equal(
      Array.isArray(byType.SocialLinks.props.platforms) &&
        byType.SocialLinks.props.platforms.length,
      3
    );
    assert.equal(
      Array.isArray(byType.ImageGallery.props.images) && byType.ImageGallery.props.images.length,
      3
    );
    assert.equal(byType.VideoEmbed.props.videoUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.match(
      String(byType.RichText.props.contentHtml),
      /canonical all-components homepage fixture/i
    );
    assert.equal(byType.LinkButton.props.label, 'Join the membership');
    assert.equal(byType.MarshmallowWidget.props.displayMode, 'full');
    assert.equal(
      Array.isArray(byType.Schedule.props.events) && byType.Schedule.props.events.length,
      3
    );
    assert.equal(byType.MusicPlayer.props.platform, 'spotify');
    assert.equal(byType.LiveStatus.props.isLive, true);
    assert.equal(byType.Divider.props.style, 'dashed');
    assert.equal(byType.Spacer.props.height, 'large');
    assert.equal(byType.BilibiliDynamic.props.uid, '123456');
  });
});
