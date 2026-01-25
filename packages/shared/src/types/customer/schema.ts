// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// --- Enums ---
export type ProfileType = 'individual' | 'company';

export type CommunicationType = 'MOBILE' | 'HOME' | 'WORK' | 'PERSONAL' | 'OTHER';
export type AddressType = 'HOME' | 'WORK' | 'BILLING' | 'SHIPPING' | 'OTHER';

// --- Base ---
export interface CustomerStatus {
  id: string;
  code: string;
  name: string;
  color: string;
}

export interface SocialPlatform {
  id: string;
  code: string;
  name: string;
  icon_url?: string;
  color?: string;
}

export interface MembershipLevel {
  code: string;
  name: string;
  rank: number;
  color?: string;
  badge_url?: string;
}

export interface TalentSummary {
  id: string;
  code: string;
  display_name: string;
}

export interface ProfileStore {
  id: string;
  code: string;
  name: string;
}

// --- Customer Core ---
export interface CustomerProfileBase {
  id: string;
  profile_type: ProfileType;
  talent_id: string;
  profile_store_id: string;
  nickname: string;
  primary_language?: string;
  status: CustomerStatus;
  tags: string[];
  source?: string;
  notes?: string;
  is_active: boolean;
  
  origin_talent: TalentSummary;
  last_modified_talent?: TalentSummary | null;
  
  created_at: string;
  updated_at: string;
}

// --- Individual Specific ---
export interface PhoneNumber {
  type_code: CommunicationType;
  number: string;
  is_primary?: boolean;
}

export interface Email {
  type_code: CommunicationType;
  address: string;
  is_primary?: boolean;
}

export interface Address {
  type_code: AddressType;
  country_code: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  postal_code?: string;
  is_primary?: boolean;
}

export interface PiiData {
  given_name?: string;
  family_name?: string;
  gender?: string;
  birth_date?: string;
  phone_numbers?: PhoneNumber[];
  emails?: Email[];
  addresses?: Address[];
}

export interface CustomerIndividual extends CustomerProfileBase {
  profile_type: 'individual';
  individual: {
    rm_profile_id: string;
    search_hint_name?: string; // "张*三"
    search_hint_phone_last4?: string; // "5678"
    pii_loaded: boolean;
    pii_data?: PiiData; // Only present if loaded
  };
}

// --- Company Specific ---
export interface CustomerCompany extends CustomerProfileBase {
  profile_type: 'company';
  company: {
    company_legal_name: string;
    company_short_name?: string;
    registration_number?: string;
    vat_id?: string;
    establishment_date?: string;
    business_segment?: { code: string; name: string };
    website?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    contact_department?: string;
  };
}

export type CustomerProfile = CustomerIndividual | CustomerCompany;

// --- Platform Identity ---
export interface PlatformIdentity {
  id: string;
  platform: SocialPlatform;
  platform_uid: string;
  platform_nickname?: string;
  platform_avatar_url?: string;
  profile_url?: string;
  is_verified: boolean;
  is_current: boolean;
  captured_at: string;
}

export interface PlatformIdentityHistory {
  id: string;
  identity_id: string;
  platform: SocialPlatform;
  change_type: 'uid_changed' | 'nickname_changed' | 'deactivated';
  old_value?: string;
  new_value?: string;
  captured_at: string;
  captured_by?: { id: string; username: string };
}

// --- Membership ---
export interface MembershipRecord {
  id: string;
  platform: SocialPlatform;
  membership_level: MembershipLevel;
  valid_from: string;
  valid_to?: string;
  auto_renew: boolean;
  is_expired: boolean;
  note?: string;
}

export interface MembershipSummary {
  highest_level: {
    platform_code: string;
    platform_name: string;
    level_code: string;
    level_name: string;
    color: string;
  } | null;
  active_count: number;
  total_count: number;
}

// --- Access Log ---
export interface CustomerAccessLog {
  id: string;
  action: string;
  talent: TalentSummary;
  operator: { id: string; username: string };
  occurred_at: string;
  field_changes?: Record<string, { old: unknown; new: unknown }>;
}

// --- Import ---
export interface ImportJob {
  id: string;
  job_type: 'individual_import' | 'company_import';
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  file_name: string;
  progress: {
    total_rows: number;
    processed_rows: number;
    success_rows: number;
    failed_rows: number;
    percentage: number;
  };
  started_at?: string;
  created_at: string;
}
