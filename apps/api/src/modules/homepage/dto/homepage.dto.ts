// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min
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
// Theme Types
// =============================================================================

export enum ThemePreset {
  DEFAULT = 'default',
  DARK = 'dark',
  SOFT = 'soft',
  CUTE = 'cute',
  MINIMAL = 'minimal',
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
}

export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string;
  overlay?: string;
}

export interface ThemeCard {
  background: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  shadow: 'none' | 'small' | 'medium' | 'large';
}

export interface ThemeTypography {
  fontFamily: 'system' | 'noto-sans' | 'inter';
  headingWeight: 'normal' | 'medium' | 'bold';
}

export interface ThemeConfig {
  preset: ThemePreset;
  colors: ThemeColors;
  background: ThemeBackground;
  card: ThemeCard;
  typography: ThemeTypography;
}

// =============================================================================
// Request DTOs
// =============================================================================

export class SaveDraftDto {
  @ApiProperty({ description: 'Homepage content with components', type: Object })
  @IsObject()
  content!: HomepageContent;

  @ApiPropertyOptional({ description: 'Theme configuration', type: Object })
  @IsOptional()
  @IsObject()
  theme?: ThemeConfig;
}

export class PublishDto {
  @ApiPropertyOptional({ description: 'Specific version number to publish', example: 1 })
  @IsOptional()
  @IsInt()
  version?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'SEO title for the homepage', example: 'My Fan Page', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description', example: 'Welcome to my fan page!', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Open Graph image URL', example: 'https://example.com/og.jpg', maxLength: 512 })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  ogImageUrl?: string;

  @ApiPropertyOptional({ description: 'Google Analytics ID', example: 'G-XXXXXXXXXX', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  analyticsId?: string;

  @ApiPropertyOptional({ description: 'Custom domain for the homepage', example: 'fanpage.example.com', maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
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
