// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// --- Enums ---
export type AdapterType = 'oauth' | 'api_key' | 'webhook';
export type OwnerType = 'tenant' | 'subsidiary' | 'talent';

// --- Adapter ---
export interface IntegrationAdapter {
  id: string;
  owner_type: OwnerType;
  owner_id: string | null;
  owner_name?: string;
  platform: {
    id: string;
    code: string;
    name: string;
    icon_url?: string;
  };
  code: string;
  name: string;
  adapter_type: AdapterType;
  inherit: boolean;
  is_active: boolean;
  is_inherited: boolean;
  is_disabled_here: boolean;
  can_disable: boolean;
  config_count: number;
  configs?: AdapterConfig[];
  updated_at: string;
}

export interface AdapterConfig {
  id: string;
  config_key: string;
  config_value: string;
  is_secret: boolean;
}

// --- Webhook ---
export interface Webhook {
  id: string;
  code: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at?: string;
  last_status?: number; // 200, 500, etc.
  consecutive_failures: number;
  created_at: string;
}

export interface WebhookEventDefinition {
  event: string;
  name: string;
  description: string;
  category: string;
}

// --- Consumer ---
export interface Consumer {
  id: string;
  code: string;
  name: string;
  api_key_prefix: string;
  is_active: boolean;
  allowed_ips?: string[];
  created_at: string;
}

// --- Config Definitions ---
export const ADAPTER_CONFIG_KEYS = {
  oauth: [
    { key: 'client_id', label: 'Client ID', required: true, secret: false },
    { key: 'client_secret', label: 'Client Secret', required: true, secret: true },
    { key: 'scopes', label: 'Scopes', required: false, secret: false },
    { key: 'redirect_uri', label: 'Redirect URI', required: false, secret: false },
  ],
  api_key: [
    { key: 'api_key', label: 'API Key', required: true, secret: true },
    { key: 'endpoint_url', label: 'Endpoint URL', required: false, secret: false },
  ],
};
