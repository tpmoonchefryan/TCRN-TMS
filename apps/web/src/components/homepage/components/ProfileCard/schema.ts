// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

export const ProfileCardSchema = z.object({
  avatarUrl: z.string().optional(),
  displayName: z.string().min(1, 'Display name is required'),
  bio: z.string().optional(),
  avatarShape: z.enum(['circle', 'rounded', 'square']).default('circle'),
  nameFontSize: z.enum(['small', 'medium', 'large']).default('large'),
  bioMaxLines: z.number().min(1).max(10).default(3),
  // New fields
  borderColor: z.string().optional(),
  borderWidth: z.enum(['none', 'thin', 'medium', 'thick']).default('none'),
  shadowSize: z.enum(['none', 'small', 'medium', 'large']).default('none'),
  backgroundUrl: z.string().optional(),
  animation: z.enum(['none', 'fadeIn', 'slideUp', 'pulse', 'bounce']).default('none'),
});

export type ProfileCardProps = z.infer<typeof ProfileCardSchema>;

export const defaultProps: ProfileCardProps = {
  avatarUrl: '',
  displayName: 'Your Name',
  bio: 'Hello, this is my bio!',
  avatarShape: 'circle',
  nameFontSize: 'large',
  bioMaxLines: 3,
  borderColor: '',
  borderWidth: 'none',
  shadowSize: 'none',
  backgroundUrl: '',
  animation: 'none',
};
