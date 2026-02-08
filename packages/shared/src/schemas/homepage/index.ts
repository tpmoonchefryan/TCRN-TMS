// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Homepage Module Zod Schemas - Validation for personal homepage editor

import { z } from 'zod';

import { PaginationSchema } from '../common.schema';

// ============================================================================
// Enums
// ============================================================================
export const ComponentTypeSchema = z.enum([
  'ProfileCard', 'SocialLinks', 'ImageGallery', 'VideoEmbed', 'RichText',
  'LinkButton', 'MarshmallowWidget', 'Divider', 'Spacer', 'Schedule'
]);

export const ThemePresetSchema = z.enum(['default', 'dark', 'soft', 'cute', 'minimal']);
export const VisualStyleSchema = z.enum(['simple', 'glass', 'neo', 'retro', 'flat']);
export const BorderRadiusSchema = z.enum(['none', 'small', 'medium', 'large', 'full']);
export const ShadowSchema = z.enum(['none', 'small', 'medium', 'large', 'glow', 'soft']);
export const FontFamilySchema = z.enum(['system', 'noto-sans', 'inter', 'outfit', 'space-grotesk']);
export const HeadingWeightSchema = z.enum(['normal', 'medium', 'bold', 'black']);
export const AnimationIntensitySchema = z.enum(['low', 'medium', 'high']);
export const DecorationTypeSchema = z.enum(['grid', 'dots', 'gradient-blobs', 'text', 'none']);
export const VersionStatusSchema = z.enum(['draft', 'published', 'archived']);

export type HomepageComponentType = z.infer<typeof ComponentTypeSchema>;
export type HomepageThemePreset = z.infer<typeof ThemePresetSchema>;

// ============================================================================
// Theme Sub-Schemas
// ============================================================================
export const ThemeColorsSchema = z.object({
  primary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  text: z.string().optional(),
  textSecondary: z.string().optional(),
});

export const ThemeBackgroundSchema = z.object({
  type: z.enum(['solid', 'gradient', 'image']).optional(),
  value: z.string().optional(),
  overlay: z.string().optional(),
  blur: z.number().optional(),
});

export const ThemeCardSchema = z.object({
  background: z.string().optional(),
  borderRadius: BorderRadiusSchema.optional(),
  shadow: ShadowSchema.optional(),
  border: z.string().optional(),
  backdropBlur: z.number().optional(),
});

export const ThemeTypographySchema = z.object({
  fontFamily: FontFamilySchema.optional(),
  headingWeight: HeadingWeightSchema.optional(),
});

export const ThemeAnimationSchema = z.object({
  enableEntrance: z.boolean().optional(),
  enableHover: z.boolean().optional(),
  intensity: AnimationIntensitySchema.optional(),
});

export const ThemeDecorationSchema = z.object({
  type: DecorationTypeSchema.optional(),
  color: z.string().optional(),
  opacity: z.number().optional(),
  // Text decoration props
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.union([
    z.enum(['normal', 'bold', 'bolder', 'lighter']),
    z.number()
  ]).optional(),
  fontFamily: z.string().optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
  rotation: z.number().optional(),
  // Customization
  density: z.enum(['low', 'medium', 'high']).optional(),
  speed: z.enum(['slow', 'normal', 'fast']).optional(),
  scrollMode: z.enum(['parallel', 'alternate']).optional(),
  scrollAngle: z.number().optional(),
});

export const ThemeConfigSchema = z.object({
  preset: ThemePresetSchema.optional(),
  visualStyle: VisualStyleSchema.optional(),
  colors: ThemeColorsSchema.optional(),
  background: ThemeBackgroundSchema.optional(),
  card: ThemeCardSchema.optional(),
  typography: ThemeTypographySchema.optional(),
  animation: ThemeAnimationSchema.optional(),
  decorations: ThemeDecorationSchema.optional(),
});

export type ThemeColorsInput = z.infer<typeof ThemeColorsSchema>;
export type ThemeConfigInput = z.infer<typeof ThemeConfigSchema>;

// ============================================================================
// Component Schema
// ============================================================================
export const ComponentInstanceSchema = z.object({
  id: z.string(),
  type: ComponentTypeSchema,
  props: z.record(z.string(), z.unknown()),
  order: z.number(),
  visible: z.boolean(),
});

export const HomepageContentSchema = z.object({
  version: z.string(),
  components: z.array(ComponentInstanceSchema),
});

export type ComponentInstanceInput = z.infer<typeof ComponentInstanceSchema>;
export type HomepageContentInput = z.infer<typeof HomepageContentSchema>;

// ============================================================================
// Request Schemas
// ============================================================================
export const SaveDraftSchema = z.object({
  content: HomepageContentSchema,
  theme: ThemeConfigSchema.optional(),
});

export const PublishSchema = z.object({
  version: z.number().optional(),
});

export const UpdateHomepageSettingsSchema = z.object({
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  slug: z.string().optional(),
  hideSearchIndexing: z.boolean().optional(),
  analyticsId: z.string().optional(),
  customDomain: z.string().nullable().optional(),
  homepagePath: z.string().max(255).nullable().optional(),
  version: z.number().int(),
});

export const VersionListQuerySchema = PaginationSchema.extend({
  status: VersionStatusSchema.optional(),
}).extend({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export type PublishInput = z.infer<typeof PublishSchema>;
export type UpdateHomepageSettingsInput = z.infer<typeof UpdateHomepageSettingsSchema>;
export type VersionListQueryInput = z.infer<typeof VersionListQuerySchema>;
