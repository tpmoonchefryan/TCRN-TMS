'use client';

import { type ThemeConfig } from '@tcrn/shared';

import { type PublicHomepageComponentRecord } from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageComponentCard } from '@/domains/public-homepage/components/PublicHomepageComponentCard';

import {
  type HomepagePuckComponentType,
  isHomepagePuckSupportedType,
} from './homepage-puck-mappers';

export function HomepagePuckBlockPreview({
  props,
  theme,
  type,
}: Readonly<{
  props: Record<string, unknown>;
  theme: ThemeConfig;
  type: HomepagePuckComponentType;
}>) {
  if (!isHomepagePuckSupportedType(type)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        Unsupported homepage block
      </div>
    );
  }

  const component: PublicHomepageComponentRecord = {
    id: typeof props.id === 'string' ? props.id : `puck-${type}`,
    type,
    props,
    order: 1,
    visible: props.visible !== false,
  };

  return (
    <div className="homepage-puck-block-preview">
      <PublicHomepageComponentCard component={component} theme={theme} />
    </div>
  );
}
