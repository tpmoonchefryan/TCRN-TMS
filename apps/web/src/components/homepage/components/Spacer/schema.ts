// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const SpacerSchema = z.object({
  height: z.enum(['small', 'medium', 'large', 'xl', 'xxl']).default('medium'),
});

export type SpacerProps = z.infer<typeof SpacerSchema>;

export const defaultProps: SpacerProps = {
  height: 'medium',
};
