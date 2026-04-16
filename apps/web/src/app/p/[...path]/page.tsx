// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Metadata, ResolvingMetadata } from 'next';

import {
  generateMetadata as generatePublicHomepageMetadata,
  PublicHomepageScreen,
} from '@/domains/homepage-public/screens/PublicHomepageScreen';

interface PageProps {
  params: Promise<{
    path: string[];
  }>;
}

// Next.js route-segment config must be statically analyzable and cannot be re-exported.
export const revalidate = 0;

export async function generateMetadata(
  props: PageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return generatePublicHomepageMetadata(props, parent);
}

export default async function PublicHomepagePage(props: PageProps) {
  return PublicHomepageScreen(props);
}
