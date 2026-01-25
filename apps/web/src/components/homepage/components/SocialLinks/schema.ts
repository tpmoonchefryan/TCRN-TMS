// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const SocialPlatformSchema = z.object({
  platformCode: z.string(),
  url: z.string().url('Must be a valid URL'),
  label: z.string().optional(),
});

export const SocialLinksSchema = z.object({
  platforms: z.array(SocialPlatformSchema),
  style: z.enum(['icon', 'button', 'pill']).default('icon'),
  layout: z.enum(['horizontal', 'vertical', 'grid']).default('horizontal'),
  iconSize: z.enum(['small', 'medium', 'large']).default('medium'),
});

export type SocialLinksProps = z.infer<typeof SocialLinksSchema>;
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const defaultProps: SocialLinksProps = {
  platforms: [
    { platformCode: 'twitter', url: 'https://twitter.com' },
  ],
  style: 'icon',
  layout: 'horizontal',
  iconSize: 'medium',
};
