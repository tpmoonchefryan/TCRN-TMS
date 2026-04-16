// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const LinkButtonSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  style: z.enum(['solid', 'outline', 'ghost', 'link']).default('solid'),
  icon: z.string().optional(), // Lucide icon name, handled by renderer
  fullWidth: z.boolean().default(true),
  // New fields
  hoverEffect: z.enum(['none', 'scale', 'glow', 'lift', 'shake']).default('none'),
  customColor: z.string().optional(),
  openInNewTab: z.boolean().default(false),
});

export type LinkButtonProps = z.infer<typeof LinkButtonSchema>;

export const LEGACY_LINK_BUTTON_DEFAULT_LABEL = 'Click Me';

export const defaultProps: LinkButtonProps = {
  label: '',
  url: '#',
  style: 'solid',
  icon: undefined,
  fullWidth: true,
  hoverEffect: 'none',
  customColor: '',
  openInNewTab: false,
};
