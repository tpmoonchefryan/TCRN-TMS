// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const ImageItemSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const ImageGallerySchema = z.object({
  images: z.array(ImageItemSchema),
  layoutMode: z.enum(['carousel', 'grid', 'masonry']).default('carousel'),
  columns: z.number().min(1).max(4).default(2),
  gap: z.enum(['small', 'medium', 'large']).default('medium'),
  showCaptions: z.boolean().default(false),
});

export type ImageGalleryProps = z.infer<typeof ImageGallerySchema>;
export type ImageItem = z.infer<typeof ImageItemSchema>;

export const defaultProps: ImageGalleryProps = {
  images: [],
  layoutMode: 'carousel',
  columns: 2,
  gap: 'medium',
  showCaptions: false,
};
