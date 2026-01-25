// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const MarshmallowWidgetSchema = z.object({
  // Use homepagePath to link to internal marshmallow (/m/{path})
  homepagePath: z.string().min(1, 'Homepage path is required'),
  displayMode: z.enum(['card', 'button']).default('card'),
  showRecentCount: z.number().min(0).max(5).default(0),
  showSubmitButton: z.boolean().default(true),
  // i18n labels
  title: z.string().optional(),
  description: z.string().optional(),
  buttonText: z.string().optional(),
});

export type MarshmallowWidgetProps = z.infer<typeof MarshmallowWidgetSchema>;

export const defaultProps: MarshmallowWidgetProps = {
  homepagePath: '',
  displayMode: 'card',
  showRecentCount: 0,
  showSubmitButton: true,
  title: 'Marshmallow',
  description: 'Anonymous messages are welcome!',
  buttonText: 'Send Message',
};
