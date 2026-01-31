// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

// =============================================================================
// Component Types
// =============================================================================

export enum ComponentType {
  PROFILE_CARD = 'ProfileCard',
  SOCIAL_LINKS = 'SocialLinks',
  IMAGE_GALLERY = 'ImageGallery',
  VIDEO_EMBED = 'VideoEmbed',
  RICH_TEXT = 'RichText',
  LINK_BUTTON = 'LinkButton',
  MARSHMALLOW_WIDGET = 'MarshmallowWidget',
  DIVIDER = 'Divider',
  SPACER = 'Spacer',
}

export interface ComponentInstance {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface HomepageContent {
  version: string;
  components: ComponentInstance[];
}

// =============================================================================
// Theme Types (DTOs - Hybrid: camelCase for Core, snake_case for New Features)
// =============================================================================

export enum ThemePreset {
  DEFAULT = 'default',
  DARK = 'dark',
  SOFT = 'soft',
  CUTE = 'cute',
  MINIMAL = 'minimal',
}

export class ThemeColors {
  @IsString() @IsOptional() primary!: string;
  @IsString() @IsOptional() accent!: string;
  @IsString() @IsOptional() background!: string;
  @IsString() @IsOptional() text!: string;
  @IsString() @IsOptional() textSecondary!: string;
}

export class ThemeBackground {
  @IsString() @IsOptional() type!: 'solid' | 'gradient' | 'image';
  @IsString() @IsOptional() value!: string;
  @IsString() @IsOptional() overlay?: string;
  @IsNumber() @IsOptional() blur?: number;
}

export class ThemeCard {
  @IsString() @IsOptional() background!: string;
  @IsString() @IsOptional() borderRadius!: 'none' | 'small' | 'medium' | 'large' | 'full';
  @IsString() @IsOptional() shadow!: 'none' | 'small' | 'medium' | 'large' | 'glow' | 'soft';
  @IsString() @IsOptional() border?: string;
  @IsNumber() @IsOptional() backdropBlur?: number;
}

export class ThemeTypography {
  @IsString() @IsOptional() fontFamily!: 'system' | 'noto-sans' | 'inter' | 'outfit' | 'space-grotesk';
  @IsString() @IsOptional() headingWeight!: 'normal' | 'medium' | 'bold' | 'black';
}

export class ThemeAnimation {
  @IsBoolean() @IsOptional() enableEntrance!: boolean;
  @IsBoolean() @IsOptional() enableHover!: boolean;
  @IsString() @IsOptional() intensity!: 'low' | 'medium' | 'high';
}

export class ThemeDecoration {
  @IsString() @IsOptional() type!: 'grid' | 'dots' | 'gradient-blobs' | 'text' | 'none';
  @IsString() @IsOptional() color?: string;
  @IsNumber() @IsOptional() opacity?: number;

  // Text Decoration Props
  @IsString() @IsOptional() text?: string;
  @IsNumber() @IsOptional() fontSize?: number;
  @IsOptional() fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  @IsString() @IsOptional() fontFamily?: string;
  @IsString() @IsOptional() textDecoration?: 'none' | 'underline' | 'line-through';
  @IsNumber() @IsOptional() rotation?: number;

  // Customization
  @IsString() @IsOptional() density?: 'low' | 'medium' | 'high';
  @IsString() @IsOptional() speed?: 'slow' | 'normal' | 'fast';
  @IsString() @IsOptional() scrollMode?: 'parallel' | 'alternate';
  @IsNumber() @IsOptional() scrollAngle?: number;
}

export class ThemeConfig {
  @IsEnum(ThemePreset) @IsOptional() preset!: ThemePreset;
  @IsString() @IsOptional() visualStyle!: 'simple' | 'glass' | 'neo' | 'retro' | 'flat';

  @ValidateNested() @Type(() => ThemeColors) @IsOptional() colors!: ThemeColors;
  @ValidateNested() @Type(() => ThemeBackground) @IsOptional() background!: ThemeBackground;
  @ValidateNested() @Type(() => ThemeCard) @IsOptional() card!: ThemeCard;
  @ValidateNested() @Type(() => ThemeTypography) @IsOptional() typography!: ThemeTypography;
  @ValidateNested() @Type(() => ThemeAnimation) @IsOptional() animation!: ThemeAnimation;
  @ValidateNested() @Type(() => ThemeDecoration) @IsOptional() decorations!: ThemeDecoration;
}

// =============================================================================
// Request DTOs
// =============================================================================

export class SaveDraftDto {
  @ApiProperty({ description: 'Homepage content with components', type: Object })
  @IsObject()
  content!: HomepageContent;

  @ApiPropertyOptional({ description: 'Theme configuration', type: ThemeConfig })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeConfig)
  theme?: ThemeConfig;
}

export class PublishDto {
  @ApiPropertyOptional({ description: 'Specific version number to publish', example: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'SEO title for the homepage', example: 'My Fan Page', maxLength: 128 })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description', example: 'Welcome to my fan page!', maxLength: 512 })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Open Graph image URL', example: 'https://example.com/og.jpg', maxLength: 512 })
  @IsOptional()
  @IsString()
  ogImageUrl?: string;

  @ApiPropertyOptional({ description: 'Custom URL slug', example: 'my-page', maxLength: 64 })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Whether to hide search engine indexing', example: false })
  @IsOptional()
  @IsBoolean()
  hideSearchIndexing?: boolean;

  @ApiPropertyOptional({ description: 'Google Analytics ID', example: 'G-XXXXXXXXXX', maxLength: 64 })
  @IsOptional()
  @IsString()
  analyticsId?: string;

  @ApiPropertyOptional({ description: 'Custom domain for the homepage', example: 'fanpage.example.com', maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({ description: 'Custom path for the homepage URL', example: 'my-page', maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  homepagePath?: string | null;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsInt()
  version!: number;
}

export class VersionListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by version status', enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

// =============================================================================
// Response Types
// =============================================================================

export interface VersionInfo {
  id: string;
  versionNumber: number;
  content: HomepageContent;
  theme: ThemeConfig;
  publishedAt: string | null;
  publishedBy: { id: string; username: string } | null;
  createdAt: string;
}

export interface HomepageResponse {
  id: string;
  talentId: string;
  isPublished: boolean;
  publishedVersion: VersionInfo | null;
  draftVersion: VersionInfo | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  analyticsId: string | null;
  homepagePath: string | null;
  homepageUrl: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface VersionListItem {
  id: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  contentPreview: string;
  componentCount: number;
  publishedAt: string | null;
  publishedBy: { id: string; username: string } | null;
  createdAt: string;
  createdBy: { id: string; username: string } | null;
}
