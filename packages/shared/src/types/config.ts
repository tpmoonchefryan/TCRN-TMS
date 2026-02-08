// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { 
  BlocklistAction,
  BlocklistPatternType,
  OwnerType,
  SeverityLevel
} from './enums';

// System Dictionary Types
export interface DictionaryItem {
  code: string;
  name: string;
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  offset?: string; // For timezone
}

export interface DictionaryCategory {
  type: string;
  name: string;
  count: number;
}

// Configuration Entity Base
export interface ConfigEntity {
  id: string;
  owner_type: OwnerType;
  owner_id?: string | null;
  owner_name?: string; // Hydrated field
  code: string;
  name: string; // Current locale
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  description?: string; // Current locale
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  sort_order: number;
  is_active: boolean;
  is_force_use: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  
  // Computed / Hydrated fields
  is_inherited?: boolean;
  is_disabled_here?: boolean;
  can_disable?: boolean;
}

// Specific Configuration Types
export interface CustomerStatusConfig extends ConfigEntity {
  color: string;
}

export interface SocialPlatformConfig extends ConfigEntity {
  display_name: string;
  icon_url?: string;
  base_url?: string;
  profile_url_template?: string;
  color?: string;
}

export interface BlocklistConfig extends ConfigEntity {
  pattern: string;
  pattern_type: BlocklistPatternType;
  action: BlocklistAction;
  replacement?: string;
  scope: string[];
  severity: SeverityLevel;
  category?: string;
  match_count?: number;
}

// ... Add other specific types as needed

// Registry for UI Mapping
export const ENTITY_TYPES = {
  CUSTOMER_STATUS: 'customer-statuses',
  SOCIAL_PLATFORM: 'social-platforms',
  BLOCKLIST: 'blocklist-entries',
  // ...
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
