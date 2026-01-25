// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

// =============================================================================
// Component Types
// =============================================================================

export type ComponentType = 
  | 'ProfileCard'
  | 'SocialLinks'
  | 'ImageGallery'
  | 'VideoEmbed'
  | 'RichText'
  | 'LinkButton'
  | 'MarshmallowWidget'
  | 'Divider'
  | 'Spacer';

export interface ComponentInstance {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  order?: number;  // Optional: order can be inferred from array position
  visible: boolean;
}

export interface HomepageContent {
  version: string;
  components: ComponentInstance[];
}

// =============================================================================
// Component Registry Types
// =============================================================================

export interface ComponentDefinition {
  type: ComponentType;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  icon: any; // Lucide icon component
  category: 'core' | 'media' | 'content' | 'layout' | 'interactive';
  defaultProps: Record<string, any>;
  schema?: any; // JSON Schema or Zod schema (TBD)
  preview: React.ComponentType<any>;
  editor: React.ComponentType<any>;
}

// =============================================================================
// Theme Types
// =============================================================================

export type ThemePresetName = 'default' | 'dark' | 'soft' | 'cute' | 'minimal';

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
  preset: ThemePresetName;
  colors: ThemeColors;
  background: ThemeBackground;
  card: ThemeCard;
  typography: ThemeTypography;
}

// =============================================================================
// Legacy Component Type Migration
// =============================================================================

/**
 * Mapping from legacy component type names to current types.
 * Used for backward compatibility with older homepage data.
 */
export const LEGACY_COMPONENT_TYPE_MAP: Record<string, ComponentType> = {
  hero: 'ProfileCard',
  about: 'RichText',
  socialLinks: 'SocialLinks',
  sociallinks: 'SocialLinks',
  imageGallery: 'ImageGallery',
  imagegallery: 'ImageGallery',
  videoEmbed: 'VideoEmbed',
  videoembed: 'VideoEmbed',
  richText: 'RichText',
  richtext: 'RichText',
  linkButton: 'LinkButton',
  linkbutton: 'LinkButton',
  marshmallowWidget: 'MarshmallowWidget',
  marshmallowwidget: 'MarshmallowWidget',
  divider: 'Divider',
  spacer: 'Spacer',
};

/**
 * Migrate a single component type from legacy format to current format.
 */
export function migrateComponentType(type: string): ComponentType {
  return LEGACY_COMPONENT_TYPE_MAP[type] || 
         LEGACY_COMPONENT_TYPE_MAP[type.toLowerCase()] || 
         type as ComponentType;
}

/**
 * Migrate all component types in a HomepageContent object.
 */
export function migrateComponentTypes(content: HomepageContent): HomepageContent {
  if (!content?.components?.length) return content;
  
  return {
    ...content,
    components: content.components.map((comp) => {
      const migratedType = migrateComponentType(comp.type);
      
      if (migratedType !== comp.type) {
        return { ...comp, type: migratedType };
      }
      return comp;
    }),
  };
}
