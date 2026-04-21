import type { ScopedConfigEntityType } from '@/domains/config-dictionary-settings/api/settings.api';

export type ConfigEntityFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'color'
  | 'url'
  | 'datetime-local'
  | 'parent-select';

export interface ConfigEntityFieldDefinition {
  key: string;
  label: string;
  kind: ConfigEntityFieldKind;
  required?: boolean;
  placeholder?: string;
  description?: string;
}

export interface ConfigEntityCatalogEntry {
  type: ScopedConfigEntityType;
  label: string;
  description: string;
  parentType?: ScopedConfigEntityType;
  parentFieldKey?: string;
  fields: ConfigEntityFieldDefinition[];
}

export const CONFIG_ENTITY_ORDER: ScopedConfigEntityType[] = [
  'business-segment',
  'customer-status',
  'address-type',
  'channel-category',
  'communication-type',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'consent',
];

export const CONFIG_ENTITY_CATALOG: Record<ScopedConfigEntityType, ConfigEntityCatalogEntry> = {
  'business-segment': {
    type: 'business-segment',
    label: 'Business Segment',
    description: 'Business segments used to group customers at this level.',
    fields: [],
  },
  'customer-status': {
    type: 'customer-status',
    label: 'Customer Status',
    description: 'Status labels used in customer filters and lifecycle views.',
    fields: [
      {
        key: 'color',
        label: 'Badge color',
        kind: 'color',
        placeholder: '#4f46e5',
      },
    ],
  },
  'address-type': {
    type: 'address-type',
    label: 'Address Type',
    description: 'Address type options used in customer and profile forms.',
    fields: [],
  },
  'channel-category': {
    type: 'channel-category',
    label: 'Channel Category',
    description: 'Top-level channel groups for communication methods.',
    fields: [],
  },
  'communication-type': {
    type: 'communication-type',
    label: 'Communication Type',
    description: 'Communication methods used in customer contact records.',
    parentType: 'channel-category',
    parentFieldKey: 'channelCategoryId',
    fields: [
      {
        key: 'channelCategoryId',
        label: 'Channel category',
        kind: 'parent-select',
        required: true,
      },
    ],
  },
  'reason-category': {
    type: 'reason-category',
    label: 'Reason Category',
    description: 'Top-level categories for customer inactivation reasons.',
    fields: [],
  },
  'inactivation-reason': {
    type: 'inactivation-reason',
    label: 'Inactivation Reason',
    description: 'Concrete customer inactivation reasons attached to a reason category.',
    parentType: 'reason-category',
    parentFieldKey: 'reasonCategoryId',
    fields: [
      {
        key: 'reasonCategoryId',
        label: 'Reason category',
        kind: 'parent-select',
        required: true,
      },
    ],
  },
  'membership-class': {
    type: 'membership-class',
    label: 'Membership Category',
    description: 'Top-level membership categories available to this tenant.',
    fields: [],
  },
  'membership-type': {
    type: 'membership-type',
    label: 'Membership Type',
    description: 'Membership types grouped under a membership category.',
    parentType: 'membership-class',
    parentFieldKey: 'membershipClassId',
    fields: [
      {
        key: 'membershipClassId',
        label: 'Membership category',
        kind: 'parent-select',
        required: true,
      },
      {
        key: 'externalControl',
        label: 'Externally controlled',
        kind: 'boolean',
        description: 'Marks this membership type as synchronized from an external system.',
      },
      {
        key: 'defaultRenewalDays',
        label: 'Default renewal days',
        kind: 'number',
        placeholder: '30',
      },
    ],
  },
  'membership-level': {
    type: 'membership-level',
    label: 'Membership Level',
    description: 'Concrete levels grouped under a membership type.',
    parentType: 'membership-type',
    parentFieldKey: 'membershipTypeId',
    fields: [
      {
        key: 'membershipTypeId',
        label: 'Membership type',
        kind: 'parent-select',
        required: true,
      },
      {
        key: 'rank',
        label: 'Rank',
        kind: 'number',
        required: true,
        placeholder: '1',
      },
      {
        key: 'color',
        label: 'Badge color',
        kind: 'color',
        placeholder: '#4f46e5',
      },
      {
        key: 'badgeUrl',
        label: 'Badge URL',
        kind: 'url',
        placeholder: 'https://example.com/badges/gold.svg',
      },
    ],
  },
  consent: {
    type: 'consent',
    label: 'Consent',
    description: 'Consent records with localized content and effective dates.',
    fields: [
      {
        key: 'consentVersion',
        label: 'Consent version',
        kind: 'text',
        required: true,
        placeholder: '2026.04',
      },
      {
        key: 'effectiveFrom',
        label: 'Effective from',
        kind: 'datetime-local',
        required: true,
      },
      {
        key: 'expiresAt',
        label: 'Expires at',
        kind: 'datetime-local',
      },
      {
        key: 'contentUrl',
        label: 'Hosted content URL',
        kind: 'url',
        placeholder: 'https://example.com/consent/latest',
      },
      {
        key: 'isRequired',
        label: 'Required before continue',
        kind: 'boolean',
        description: 'Controls whether this consent must be acknowledged before the related workflow continues.',
      },
      {
        key: 'contentMarkdownEn',
        label: 'Content (English)',
        kind: 'textarea',
        required: true,
      },
    ],
  },
};

export const DEFAULT_CONFIG_ENTITY_TYPE = CONFIG_ENTITY_ORDER[0];
