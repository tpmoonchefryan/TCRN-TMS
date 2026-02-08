// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const VideoEmbedSchema = z.object({
  videoUrl: z.string().url('Must be a valid URL'),
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
  autoplay: z.boolean().default(false),
  showControls: z.boolean().default(true),
  // New fields
  coverUrl: z.string().optional(),
  title: z.string().optional(),
  loop: z.boolean().default(false),
  muted: z.boolean().default(false),
});

export type VideoEmbedProps = z.infer<typeof VideoEmbedSchema>;

export const defaultProps: VideoEmbedProps = {
  videoUrl: '',
  aspectRatio: '16:9',
  autoplay: false,
  showControls: true,
  coverUrl: '',
  title: '',
  loop: false,
  muted: false,
};
