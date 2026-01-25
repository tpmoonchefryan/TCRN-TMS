// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const RichTextSchema = z.object({
  contentHtml: z.string().default(''),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
});

export type RichTextProps = z.infer<typeof RichTextSchema>;

export const defaultProps: RichTextProps = {
  contentHtml: '<p>Edit this text...</p>',
  textAlign: 'left',
};
