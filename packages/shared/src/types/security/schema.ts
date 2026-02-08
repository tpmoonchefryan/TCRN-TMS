// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BlocklistAction, BlocklistPatternType, IpRuleScope, IpRuleSource,IpRuleType, OwnerType, SeverityLevel } from '../enums';

// --- Blocklist ---
export interface BlocklistEntry {
  id: string;
  owner_type: OwnerType;
  owner_id?: string | null;
  pattern: string;
  pattern_type: BlocklistPatternType;
  name: string;
  description?: string;
  category?: string;
  severity: SeverityLevel;
  action: BlocklistAction;
  replacement?: string;
  scope: string[];
  inherit: boolean;
  is_active: boolean;
  match_count: number;
  last_matched_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; username: string };
  // Visual helper
  is_inherited?: boolean; 
  source_name?: string;
}

// --- IP Access Rule ---
export interface IpAccessRule {
  id: string;
  rule_type: IpRuleType;
  ip_pattern: string;
  scope: IpRuleScope;
  reason?: string;
  source: IpRuleSource;
  expires_at?: string;
  hit_count: number;
  last_hit_at?: string;
  is_active: boolean;
  created_at: string;
  created_by?: { id: string; username: string };
}

// --- Technical Fingerprint ---
export interface FingerprintResponse {
  fingerprint: string;
  short_fingerprint: string;
  version: string;
  generated_at: string;
}
