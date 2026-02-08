// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const SpacerSchema = z.object({
  height: z.enum(['small', 'medium', 'large', 'xl', 'xxl', 'custom']).default('medium'),
  customHeight: z.number().min(0).max(500).optional(),
  responsiveHeight: z.number().min(0).max(300).optional(), // Mobile height in px
});

export type SpacerProps = z.infer<typeof SpacerSchema>;

export const defaultProps: SpacerProps = {
  height: 'medium',
  customHeight: undefined,
  responsiveHeight: undefined,
};
