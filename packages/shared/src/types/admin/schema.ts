// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { CustomerProfileBase } from '../customer/schema';
import { Consumer } from '../integration/schema';

// --- Tenant ---
export interface Tenant {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  contact_email?: string;
  created_at: string;
  updated_at: string;
  
  // Stats (Mock)
  talent_count: number;
  customer_count: number;
}

// --- Admin Consumer (Extended) ---
export interface AdminConsumer extends Consumer {
  description?: string;
  api_calls_count?: number; // Mock stat
  last_used_at?: string;
}

// --- Admin Customer (Local PII) ---
// AC Tenant doesn't use PII Service, stores PII locally (simulated for AC view)
// Note: Using CustomerProfileBase since CustomerProfile is a union type
export interface AdminCustomerProfile extends CustomerProfileBase {
  // Overrides for AC view logic if needed
  // In reality, AC might see encrypted blobs or just not have access to PII Service
  // But per requirement "No PII Service connection, all local", we treat PII fields as local
  admin_notes?: string;
}
