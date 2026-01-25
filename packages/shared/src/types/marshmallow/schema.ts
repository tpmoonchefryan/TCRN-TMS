// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type CaptchaMode = 'always' | 'never' | 'auto';

export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export type RejectionReason = 
  | 'profanity' 
  | 'spam' 
  | 'harassment' 
  | 'off_topic' 
  | 'duplicate' 
  | 'external_link' 
  | 'other';

export interface ThemeConfig {
  primary_color?: string;
  background_image?: string;
  card_style?: 'default' | 'glass' | 'solid';
}

export interface MarshmallowConfig {
  id: string;
  talent_id: string;
  is_enabled: boolean;
  title: string | null;
  welcome_text: string | null;
  placeholder_text: string | null;
  thank_you_text: string | null;
  allow_anonymous: boolean;
  captcha_mode: CaptchaMode;
  moderation_enabled: boolean;
  auto_approve: boolean;
  profanity_filter_enabled: boolean;
  external_blocklist_enabled: boolean;
  max_message_length: number;
  min_message_length: number;
  rate_limit_per_ip: number;
  rate_limit_window_hours: number;
  reactions_enabled: boolean;
  allowed_reactions: string[];
  theme: ThemeConfig;
  
  // Computed / Metadata
  path?: string; // Virtual path derived from talent
}

export interface MarshmallowMessage {
  id: string;
  config_id: string;
  talent_id: string;
  content: string;
  sender_name: string | null;
  is_anonymous: boolean;
  status: MessageStatus;
  rejection_reason: RejectionReason | null;
  rejection_note: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_pinned: boolean;
  reply_content: string | null;
  replied_at: string | null;
  replied_by: string | null;
  reaction_counts: Record<string, number>;
  profanity_flags: string[];
  created_at: string;
  ip_address?: string; // Admin only
  user_agent?: string; // Admin only
}

export const DEFAULT_CONFIG: Partial<MarshmallowConfig> = {
  is_enabled: true,
  allow_anonymous: true,
  captcha_mode: 'auto',
  moderation_enabled: true,
  auto_approve: false,
  profanity_filter_enabled: true,
  external_blocklist_enabled: true,
  max_message_length: 500,
  min_message_length: 1,
  rate_limit_per_ip: 5,
  rate_limit_window_hours: 1,
  reactions_enabled: true,
  allowed_reactions: ['❤️', '👍', '😊', '🎉', '💯'],
  theme: { card_style: 'default' }
};
