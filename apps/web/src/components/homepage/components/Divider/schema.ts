// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const DividerSchema = z.object({
  style: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  spacing: z.enum(['small', 'medium', 'large']).default('medium'),
  color: z.enum(['default', 'primary', 'accent']).default('default'),
});

export type DividerProps = z.infer<typeof DividerSchema>;

export const defaultProps: DividerProps = {
  style: 'solid',
  spacing: 'medium',
  color: 'default',
};
