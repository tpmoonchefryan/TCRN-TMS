// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * PersonalInfo field configuration
 * Based on PRD §4.2 and §11.2
 */

export interface PersonalInfoFieldConfig {
  field: string;
  type: 'text' | 'phone_array' | 'email_array' | 'address_array' | 'phone' | 'email';
  conditional?: boolean; // Whether the field needs conditional check
}

/**
 * Fields marked as PersonalInfo that require masking in logs
 */
export const PERSONAL_INFO_FIELDS: PersonalInfoFieldConfig[] = [
  // Personal profile fields
  { field: 'given_name', type: 'text' },
  { field: 'givenName', type: 'text' },
  { field: 'family_name', type: 'text' },
  { field: 'familyName', type: 'text' },
  { field: 'birth_date', type: 'text' },
  { field: 'birthDate', type: 'text' },
  { field: 'gender', type: 'text' },

  // Contact information
  { field: 'phone_numbers', type: 'phone_array' },
  { field: 'phoneNumbers', type: 'phone_array' },
  { field: 'phone', type: 'phone' },
  { field: 'emails', type: 'email_array' },
  { field: 'email', type: 'email' },
  { field: 'addresses', type: 'address_array' },
  { field: 'address', type: 'address_array' },

  // Company profile (registration number may need masking)
  { field: 'registration_number', type: 'text' },
  { field: 'registrationNumber', type: 'text' },

  // Notes field (may contain sensitive info)
  { field: 'notes', type: 'text', conditional: true },

  // Auth-related sensitive fields
  { field: 'totp_secret', type: 'text' },
  { field: 'totpSecret', type: 'text' },
];

/**
 * Get field config by field name
 */
export function getPersonalInfoFieldConfig(
  field: string
): PersonalInfoFieldConfig | undefined {
  return PERSONAL_INFO_FIELDS.find((f) => f.field === field);
}

/**
 * Check if a field is marked as PersonalInfo
 */
export function isPersonalInfoField(field: string): boolean {
  return PERSONAL_INFO_FIELDS.some((f) => f.field === field);
}

/**
 * Entity-specific sensitive fields mapping
 */
export const ENTITY_SENSITIVE_FIELDS: Record<string, string[]> = {
  customer_profile: [
    'given_name',
    'family_name',
    'birth_date',
    'gender',
    'phone_numbers',
    'emails',
    'addresses',
    'notes',
  ],
  system_user: ['phone', 'totp_secret'],
  talent: [],
  subsidiary: [],
};

/**
 * Get sensitive fields for a specific entity type
 */
export function getSensitiveFieldsForEntity(entityType: string): string[] {
  return ENTITY_SENSITIVE_FIELDS[entityType] || [];
}
