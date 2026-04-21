'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import { Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type ConfigEntityRecord,
  type ConfigEntityScopeType,
  createConfigEntity,
  type CreateConfigEntityInput,
  deactivateConfigEntity,
  disableInheritedConfigEntity,
  enableInheritedConfigEntity,
  listAllConfigEntities,
  listConfigEntitiesPage,
  reactivateConfigEntity,
  type RequestEnvelopeFn,
  type ScopedConfigEntityType,
  updateConfigEntity,
  type UpdateConfigEntityInput,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  CONFIG_ENTITY_CATALOG,
  CONFIG_ENTITY_ORDER,
  type ConfigEntityCatalogEntry,
  type ConfigEntityFieldDefinition,
  DEFAULT_CONFIG_ENTITY_TYPE,
} from '@/domains/config-dictionary-settings/components/config-entity-catalog';
import {
  buildManagedTranslations,
  countManagedLocaleValues,
  extractManagedTranslations,
  pickLegacyLocaleValue,
  TranslationManagementDrawer,
  TranslationManagementTrigger,
} from '@/domains/config-dictionary-settings/components/TranslationManagement';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { AsyncSubmitButton, ConfirmActionDialog, StateView, TableShell } from '@/platform/ui';

interface ScopedConfigEntityWorkspaceProps {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  requestEnvelope: RequestEnvelopeFn;
  scopeType: ConfigEntityScopeType;
  scopeId?: string;
  locale?: SupportedUiLocale | RuntimeLocale;
  copy?: ScopedConfigEntityWorkspaceCopy;
  catalog?: Record<ScopedConfigEntityType, ConfigEntityCatalogEntry>;
}

type DraftValue = string | boolean;
type ConfigEntityDraft = Record<string, DraftValue>;

interface ParentOption {
  id: string;
  name: string;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface ManagedTranslationDraft {
  content: Record<string, string>;
  description: Record<string, string>;
  name: Record<string, string>;
}

interface ConfirmState {
  title: string;
  description: string;
  confirmText: string;
  intent: 'danger' | 'primary';
  entity: ConfigEntityRecord;
  action: 'deactivate' | 'reactivate' | 'disable' | 'enable';
}

export interface ScopedConfigEntityWorkspaceCopy {
  visibleRecordsLabel: string;
  activeLabel: string;
  inheritedLabel: string;
  disabledHereLabel: string;
  entityFamilyLabel: string;
  entityFamilyAriaLabel: string;
  searchLabel: string;
  searchAriaLabel: string;
  searchPlaceholder: (entryLabel: string) => string;
  refreshAriaLabel: string;
  currentScopeOnlyLabel: string;
  currentScopeOnlyAriaLabel: string;
  currentScopeOnlyDescription: (scopeLabel: string) => string;
  includeInactiveLabel: string;
  includeInactiveAriaLabel: string;
  includeInactiveDescription: string;
  unavailableTitle: string;
  retryLabel: string;
  codeColumn: string;
  nameColumn: string;
  scopeStateColumn: string;
  statusColumn: string;
  actionsColumn: string;
  emptyTitle: (entryLabel: string) => string;
  emptyOwnedDescription: (entryLabel: string, scopeLabel: string) => string;
  emptyFilteredDescription: (entryLabel: string) => string;
  emptyActionLabel: string;
  noCodeLabel: string;
  createdAtLabel: (value: string) => string;
  activeStatus: string;
  inactiveStatus: string;
  newRecordLabel: string;
  editLabel: string;
  deactivateLabel: string;
  reactivateLabel: string;
  disableHereLabel: string;
  enableHereLabel: string;
  inheritedPill: string;
  editorCreateTitle: (entryLabel: string) => string;
  editorEditTitle: (entryLabel: string, codeOrName: string) => string;
  editorDescription: (scopeLabel: string) => string;
  cancelLabel: string;
  codeLabel: string;
  codeValidation: string;
  sortOrderLabel: string;
  nameEnglishLabel: string;
  nameChineseLabel: string;
  nameJapaneseLabel: string;
  englishNameRequired: string;
  descriptionEnglishLabel: string;
  descriptionChineseLabel: string;
  descriptionJapaneseLabel: string;
  entitySpecificFieldsTitle: string;
  entitySpecificFieldsDescription: string;
  createSubmit: string;
  saveSubmit: string;
  loadError: string;
  saveError: (entryLabel: string) => string;
  createSuccess: (entryLabel: string, code: string) => string;
  updateSuccess: (entryLabel: string, code: string) => string;
  deactivateTitle: (codeOrName: string) => string;
  deactivateDescription: string;
  deactivateConfirm: string;
  deactivateSuccess: (entryLabel: string, codeOrName: string) => string;
  reactivateTitle: (codeOrName: string) => string;
  reactivateDescription: string;
  reactivateConfirm: string;
  reactivateSuccess: (entryLabel: string, codeOrName: string) => string;
  disableInScopeTitle: (codeOrName: string) => string;
  disableInScopeDescription: string;
  disableInScopeConfirm: string;
  disableInScopeSuccess: (entryLabel: string, codeOrName: string) => string;
  enableInScopeTitle: (codeOrName: string) => string;
  enableInScopeDescription: string;
  enableInScopeConfirm: string;
  enableInScopeSuccess: (entryLabel: string, codeOrName: string) => string;
  stateUpdateError: (entryLabel: string) => string;
  updatedAtSummary: (scopeLabel: string) => string;
  inheritedFromScope: (scopeLabel: string) => string;
  scopeOwned: string;
  requiredPill: string;
  systemPill: string;
  disabledHerePill: string;
  requiredField: (fieldLabel: string) => string;
  scopeTypeLabel: (scopeType: ConfigEntityScopeType) => string;
}

const DEFAULT_COPY: ScopedConfigEntityWorkspaceCopy = {
  visibleRecordsLabel: 'Visible Records',
  activeLabel: 'Active',
  inheritedLabel: 'Inherited',
  disabledHereLabel: 'Disabled Here',
  entityFamilyLabel: 'Entity family',
  entityFamilyAriaLabel: 'Entity family',
  searchLabel: 'Search',
  searchAriaLabel: 'Search configuration entities',
  searchPlaceholder: (entryLabel) => `Search ${entryLabel.toLowerCase()} by code or name`,
  refreshAriaLabel: 'Refresh configuration list',
  currentScopeOnlyLabel: 'Current scope only',
  currentScopeOnlyAriaLabel: 'Current scope only',
  currentScopeOnlyDescription: (scopeLabel) => `Hide inherited records and focus on records maintained at this ${scopeLabel}.`,
  includeInactiveLabel: 'Include inactive records',
  includeInactiveAriaLabel: 'Include inactive records',
  includeInactiveDescription: 'Keep inactive local records visible so you can review or reactivate them here.',
  unavailableTitle: 'Configuration entities unavailable',
  retryLabel: 'Retry',
  codeColumn: 'Code',
  nameColumn: 'Name',
  scopeStateColumn: 'Scope / State',
  statusColumn: 'Status',
  actionsColumn: 'Actions',
  emptyTitle: (entryLabel) => `No ${entryLabel.toLowerCase()} records returned`,
  emptyOwnedDescription: (entryLabel, scopeLabel) =>
    `No ${entryLabel.toLowerCase()} records are maintained directly at this ${scopeLabel}.`,
  emptyFilteredDescription: (entryLabel) => `No ${entryLabel.toLowerCase()} records matched the current filters.`,
  emptyActionLabel: 'Create the first record',
  noCodeLabel: 'NO_CODE',
  createdAtLabel: (value) => `Created ${value}`,
  activeStatus: 'Active',
  inactiveStatus: 'Inactive',
  newRecordLabel: 'New record',
  editLabel: 'Edit',
  deactivateLabel: 'Deactivate',
  reactivateLabel: 'Reactivate',
  disableHereLabel: 'Disable here',
  enableHereLabel: 'Enable here',
  inheritedPill: 'Inherited',
  editorCreateTitle: (entryLabel) => `Create ${entryLabel}`,
  editorEditTitle: (_entryLabel, codeOrName) => `Edit ${codeOrName}`,
  editorDescription: (scopeLabel) => `Changes here affect only this ${scopeLabel}.`,
  cancelLabel: 'Cancel',
  codeLabel: 'Code *',
  codeValidation: 'Code must be 3-32 characters using only A-Z, 0-9, and _.',
  sortOrderLabel: 'Sort order',
  nameEnglishLabel: 'Name (English) *',
  nameChineseLabel: 'Name (Chinese)',
  nameJapaneseLabel: 'Name (Japanese)',
  englishNameRequired: 'English name is required.',
  descriptionEnglishLabel: 'Description (English)',
  descriptionChineseLabel: 'Description (Chinese)',
  descriptionJapaneseLabel: 'Description (Japanese)',
  entitySpecificFieldsTitle: 'Entity-specific fields',
  entitySpecificFieldsDescription: 'Complete the fields required for this entity.',
  createSubmit: 'Create record',
  saveSubmit: 'Save changes',
  loadError: 'Failed to load configuration entities for this scope.',
  saveError: (entryLabel) => `Failed to save ${entryLabel.toLowerCase()}.`,
  createSuccess: (entryLabel, code) => `${entryLabel} ${code} created.`,
  updateSuccess: (entryLabel, code) => `${entryLabel} ${code} updated.`,
  deactivateTitle: (codeOrName) => `Deactivate ${codeOrName}?`,
  deactivateDescription: 'This marks the record inactive without deleting its history.',
  deactivateConfirm: 'Deactivate',
  deactivateSuccess: (entryLabel, codeOrName) => `${entryLabel} ${codeOrName} deactivated.`,
  reactivateTitle: (codeOrName) => `Reactivate ${codeOrName}?`,
  reactivateDescription: 'This returns the record to active status.',
  reactivateConfirm: 'Reactivate',
  reactivateSuccess: (entryLabel, codeOrName) => `${entryLabel} ${codeOrName} reactivated.`,
  disableInScopeTitle: (codeOrName) => `Disable ${codeOrName} in this scope?`,
  disableInScopeDescription: 'Hide this inherited record here without changing the source record.',
  disableInScopeConfirm: 'Disable in scope',
  disableInScopeSuccess: (entryLabel, codeOrName) => `${entryLabel} ${codeOrName} hidden here.`,
  enableInScopeTitle: (codeOrName) => `Enable ${codeOrName} in this scope?`,
  enableInScopeDescription: 'Show this inherited record here again.',
  enableInScopeConfirm: 'Enable in scope',
  enableInScopeSuccess: (entryLabel, codeOrName) => `${entryLabel} ${codeOrName} restored here.`,
  stateUpdateError: (entryLabel) => `Failed to update ${entryLabel.toLowerCase()} state.`,
  updatedAtSummary: (value) => `Updated ${value}`,
  inheritedFromScope: (scopeLabel) => `Inherited from ${scopeLabel}`,
  scopeOwned: 'Managed here',
  requiredPill: 'Required',
  systemPill: 'System',
  disabledHerePill: 'Disabled here',
  requiredField: (fieldLabel) => `${fieldLabel} is required.`,
  scopeTypeLabel: (scopeType) => scopeType,
};

const TENANT_GLOBAL_ENTITY_TYPES = new Set<ScopedConfigEntityType>([
  'membership-type',
  'membership-level',
]);

function isTenantGlobalEntityType(entityType: ScopedConfigEntityType) {
  return TENANT_GLOBAL_ENTITY_TYPES.has(entityType);
}

function isEntityInheritedInScope(
  entity: ConfigEntityRecord,
  currentScopeType: ConfigEntityScopeType,
  entityType: ScopedConfigEntityType,
) {
  if (isTenantGlobalEntityType(entityType)) {
    return currentScopeType !== 'tenant';
  }

  return entity.isInherited;
}

function resolveEntityOwnerScopeType(
  entity: ConfigEntityRecord,
  entityType: ScopedConfigEntityType,
) {
  if (isTenantGlobalEntityType(entityType)) {
    return 'tenant' as const;
  }

  return entity.ownerType ?? 'tenant';
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function formatDateTime(locale: SupportedUiLocale | RuntimeLocale, value: string) {
  return formatLocaleDateTime(locale, value, value);
}

function toDateTimeLocalValue(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function normalizeDateTimeValue(value: string) {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function normalizeStringValue(value: DraftValue) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function createEmptyDraft(entry: ConfigEntityCatalogEntry) {
  const baseDraft: ConfigEntityDraft = {
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    descriptionEn: '',
    descriptionZh: '',
    descriptionJa: '',
    sortOrder: '0',
  };

  entry.fields.forEach((field) => {
    baseDraft[field.key] = field.kind === 'boolean' ? false : '';
  });

  return baseDraft;
}

function createDraftFromEntity(entry: ConfigEntityCatalogEntry, entity: ConfigEntityRecord) {
  const nextDraft = createEmptyDraft(entry);

  nextDraft.code = entity.code ?? '';
  nextDraft.nameEn = entity.nameEn;
  nextDraft.nameZh = entity.nameZh ?? '';
  nextDraft.nameJa = entity.nameJa ?? '';
  nextDraft.descriptionEn = entity.descriptionEn ?? '';
  nextDraft.descriptionZh = entity.descriptionZh ?? '';
  nextDraft.descriptionJa = entity.descriptionJa ?? '';
  nextDraft.sortOrder = String(entity.sortOrder ?? 0);

  entry.fields.forEach((field) => {
    const raw = entity[field.key];

    if (field.kind === 'boolean') {
      nextDraft[field.key] = Boolean(raw);
      return;
    }

    if (field.kind === 'datetime-local') {
      nextDraft[field.key] = toDateTimeLocalValue(raw);
      return;
    }

    nextDraft[field.key] =
      typeof raw === 'string' || typeof raw === 'number' ? String(raw) : raw == null ? '' : String(raw);
  });

  return nextDraft;
}

function validateDraft(
  entry: ConfigEntityCatalogEntry,
  draft: ConfigEntityDraft,
  copy: ScopedConfigEntityWorkspaceCopy,
) {
  const code = normalizeStringValue(draft.code);
  if (!code || !/^[A-Z0-9_]{3,32}$/.test(code.toUpperCase())) {
    return copy.codeValidation;
  }

  if (!normalizeStringValue(draft.nameEn)) {
    return copy.englishNameRequired;
  }

  for (const field of entry.fields) {
    if (!field.required) {
      continue;
    }

    if (field.kind === 'boolean') {
      continue;
    }

    if (!normalizeStringValue(draft[field.key])) {
      return copy.requiredField(field.label);
    }
  }

  return null;
}

function buildCreatePayload(
  entry: ConfigEntityCatalogEntry,
  draft: ConfigEntityDraft,
  scopeType: ConfigEntityScopeType,
  scopeId: string | undefined,
  managedTranslations: ManagedTranslationDraft,
): CreateConfigEntityInput {
  const nameEn = normalizeStringValue(draft.nameEn) || '';
  const descriptionEn = normalizeStringValue(draft.descriptionEn);
  const translations = buildManagedTranslations(nameEn, managedTranslations.name);
  const descriptionTranslations = buildManagedTranslations(descriptionEn, managedTranslations.description);
  const payload: CreateConfigEntityInput = {
    code: (normalizeStringValue(draft.code) || '').toUpperCase(),
    nameEn,
    nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
    nameJa: pickLegacyLocaleValue(translations, 'ja'),
    translations,
    descriptionEn,
    descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
    descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
    descriptionTranslations,
    sortOrder: Number(normalizeStringValue(draft.sortOrder) || '0'),
    ownerType: scopeType,
  };

  if (scopeId) {
    payload.ownerId = scopeId;
  }

  entry.fields.forEach((field) => {
    const value = draft[field.key];

    if (field.kind === 'boolean') {
      payload[field.key as keyof CreateConfigEntityInput] = Boolean(value) as never;
      return;
    }

    if (field.kind === 'number') {
      const normalized = normalizeStringValue(value);
      if (normalized) {
        payload[field.key as keyof CreateConfigEntityInput] = Number(normalized) as never;
      }
      return;
    }

    if (field.kind === 'datetime-local') {
      const normalized = typeof value === 'string' ? normalizeDateTimeValue(value) : undefined;
      if (normalized) {
        payload[field.key as keyof CreateConfigEntityInput] = normalized as never;
      }
      return;
    }

    const normalized = normalizeStringValue(value);
    if (normalized) {
      payload[field.key as keyof CreateConfigEntityInput] = normalized as never;
    }
  });

  if (entry.type === 'consent') {
    const contentMarkdownEn = normalizeStringValue(draft.contentMarkdownEn);
    const contentTranslations = buildManagedTranslations(contentMarkdownEn, managedTranslations.content);

    payload.contentMarkdownEn = contentMarkdownEn;
    payload.contentMarkdownZh = pickLegacyLocaleValue(contentTranslations, 'zh_HANS');
    payload.contentMarkdownJa = pickLegacyLocaleValue(contentTranslations, 'ja');
    payload.contentTranslations = contentTranslations;
  }

  return payload;
}

function buildUpdatePayload(
  entry: ConfigEntityCatalogEntry,
  draft: ConfigEntityDraft,
  version: number,
  managedTranslations: ManagedTranslationDraft,
): UpdateConfigEntityInput {
  const nameEn = normalizeStringValue(draft.nameEn) || '';
  const descriptionEn = normalizeStringValue(draft.descriptionEn);
  const translations = buildManagedTranslations(nameEn, managedTranslations.name);
  const descriptionTranslations = buildManagedTranslations(descriptionEn, managedTranslations.description);
  const payload: UpdateConfigEntityInput = {
    version,
    nameEn,
    nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
    nameJa: pickLegacyLocaleValue(translations, 'ja'),
    translations,
    descriptionEn,
    descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
    descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
    descriptionTranslations,
    sortOrder: Number(normalizeStringValue(draft.sortOrder) || '0'),
  };

  entry.fields.forEach((field) => {
    const value = draft[field.key];

    if (field.kind === 'boolean') {
      payload[field.key as keyof UpdateConfigEntityInput] = Boolean(value) as never;
      return;
    }

    if (field.kind === 'number') {
      const normalized = normalizeStringValue(value);
      if (normalized) {
        payload[field.key as keyof UpdateConfigEntityInput] = Number(normalized) as never;
      }
      return;
    }

    if (field.kind === 'datetime-local') {
      const normalized = typeof value === 'string' ? normalizeDateTimeValue(value) : undefined;
      payload[field.key as keyof UpdateConfigEntityInput] = normalized as never;
      return;
    }

    payload[field.key as keyof UpdateConfigEntityInput] = normalizeStringValue(value) as never;
  });

  if (entry.type === 'consent') {
    const contentMarkdownEn = normalizeStringValue(draft.contentMarkdownEn);
    const contentTranslations = buildManagedTranslations(contentMarkdownEn, managedTranslations.content);

    payload.contentMarkdownEn = contentMarkdownEn;
    payload.contentMarkdownZh = pickLegacyLocaleValue(contentTranslations, 'zh_HANS');
    payload.contentMarkdownJa = pickLegacyLocaleValue(contentTranslations, 'ja');
    payload.contentTranslations = contentTranslations;
  }

  return payload;
}

function createEmptyManagedTranslations(): ManagedTranslationDraft {
  return {
    content: {},
    description: {},
    name: {},
  };
}

function createManagedTranslationsFromEntity(
  entry: ConfigEntityCatalogEntry,
  entity: ConfigEntityRecord | null,
): ManagedTranslationDraft {
  if (!entity) {
    return createEmptyManagedTranslations();
  }

  return {
    name: extractManagedTranslations(entity.nameEn, entity.translations, {
      zh_HANS: entity.nameZh,
      ja: entity.nameJa,
    }),
    description: extractManagedTranslations(entity.descriptionEn, entity.descriptionTranslations, {
      zh_HANS: entity.descriptionZh,
      ja: entity.descriptionJa,
    }),
    content:
      entry.type === 'consent'
        ? extractManagedTranslations(entity.contentMarkdownEn, entity.contentTranslations, {
            zh_HANS: entity.contentMarkdownZh,
            ja: entity.contentMarkdownJa,
          })
        : {},
  };
}

function renderScopeSummary(
  locale: SupportedUiLocale | RuntimeLocale,
  entity: ConfigEntityRecord,
  copy: ScopedConfigEntityWorkspaceCopy,
  scopeType: ConfigEntityScopeType,
  entityType: ScopedConfigEntityType,
) {
  const ownerScopeType = resolveEntityOwnerScopeType(entity, entityType);
  const scopeTone =
    ownerScopeType === 'talent'
      ? 'bg-rose-100 text-rose-700'
      : ownerScopeType === 'subsidiary'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-700';
  const isInherited = isEntityInheritedInScope(entity, scopeType, entityType);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${scopeTone}`}>
          {isInherited
            ? copy.inheritedFromScope(copy.scopeTypeLabel(ownerScopeType))
            : copy.scopeOwned}
        </span>
        {entity.isDisabledHere ? (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {copy.disabledHerePill}
          </span>
        ) : null}
        {entity.isForceUse ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
            {copy.requiredPill}
          </span>
        ) : null}
        {entity.isSystem ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {copy.systemPill}
          </span>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {copy.updatedAtSummary(formatDateTime(locale, entity.updatedAt))}
      </p>
    </div>
  );
}

function renderField(
  field: ConfigEntityFieldDefinition,
  draft: ConfigEntityDraft,
  parentOptions: ParentOption[],
  onChange: (key: string, value: DraftValue) => void,
  _copy: ScopedConfigEntityWorkspaceCopy,
) {
  const value = draft[field.key];

  if (field.kind === 'boolean') {
    return (
      <label
        key={field.key}
        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <input
          aria-label={field.label}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.key, event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">{field.label}</p>
          {field.description ? <p className="text-sm leading-6 text-slate-600">{field.description}</p> : null}
        </div>
      </label>
    );
  }

  if (field.kind === 'parent-select') {
    return (
      <label key={field.key} className="space-y-2">
        <span className="text-sm font-semibold text-slate-900">
          {field.label}
          {field.required ? ' *' : ''}
        </span>
        <select
          aria-label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
        >
          <option value="">Select a parent record</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <label key={field.key} className="space-y-2">
        <span className="text-sm font-semibold text-slate-900">
          {field.label}
          {field.required ? ' *' : ''}
        </span>
        <textarea
          aria-label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
        />
      </label>
    );
  }

  if (field.kind === 'color') {
    return (
      <label key={field.key} className="space-y-2">
        <span className="text-sm font-semibold text-slate-900">{field.label}</span>
        <div className="flex items-center gap-3">
          <input
            aria-label={`${field.label} swatch`}
            type="color"
            value={typeof value === 'string' && value.length > 0 ? value : '#4f46e5'}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="h-12 w-14 rounded-xl border border-slate-200 bg-white p-1"
          />
          <input
            aria-label={field.label}
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
          />
        </div>
      </label>
    );
  }

  return (
    <label key={field.key} className="space-y-2">
      <span className="text-sm font-semibold text-slate-900">
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      <input
        aria-label={field.label}
        type={
          field.kind === 'number'
            ? 'number'
            : field.kind === 'url'
              ? 'url'
              : field.kind === 'datetime-local'
                ? 'datetime-local'
                : 'text'
        }
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
      />
      {field.description ? <p className="text-xs leading-5 text-slate-500">{field.description}</p> : null}
    </label>
  );
}

export function ScopedConfigEntityWorkspace({
  request,
  requestEnvelope,
  scopeType,
  scopeId,
  locale = 'en',
  copy = DEFAULT_COPY,
  catalog = CONFIG_ENTITY_CATALOG,
}: Readonly<ScopedConfigEntityWorkspaceProps>) {
  const resolvedCopy = copy;
  const [selectedType, setSelectedType] = useState<ScopedConfigEntityType>(DEFAULT_CONFIG_ENTITY_TYPE);
  const [records, setRecords] = useState<ConfigEntityRecord[]>([]);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentScopeOnly, setCurrentScopeOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [pagination, setPagination] = useState<ApiPaginationMeta>(() =>
    buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0]),
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const [editorMode, setEditorMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editorTarget, setEditorTarget] = useState<ConfigEntityRecord | null>(null);
  const [draft, setDraft] = useState<ConfigEntityDraft>(() => createEmptyDraft(catalog[DEFAULT_CONFIG_ENTITY_TYPE]));
  const [managedTranslations, setManagedTranslations] = useState<ManagedTranslationDraft>(
    createEmptyManagedTranslations(),
  );
  const [isTranslationsOpen, setIsTranslationsOpen] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorPending, setEditorPending] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const selectedEntry = catalog[selectedType];
  const supportsLocalScopeOnly = !isTenantGlobalEntityType(selectedType);
  const canManageSelectedTypeInCurrentScope = !isTenantGlobalEntityType(selectedType) || scopeType === 'tenant';
  const effectiveCurrentScopeOnly = supportsLocalScopeOnly ? currentScopeOnly : false;
  const inheritedOnlyNotice =
    !canManageSelectedTypeInCurrentScope
      ? pickLocaleText(locale, {
          en: `${selectedEntry.label} is managed at the tenant scope and can only be reviewed here.`,
          zh: `${selectedEntry.label} 仅能在租户范围维护，这里只能查看继承结果。`,
          ja: `${selectedEntry.label} はテナントスコープでのみ管理でき、この画面では継承結果の確認のみ可能です。`,
        })
      : null;
  const translationEditorCopy =
    {
      closeButtonAriaLabel: pickLocaleText(locale, {
        en: 'Close translation management drawer',
        zh: '关闭翻译管理抽屉',
        ja: '翻訳管理ドロワーを閉じる',
      }),
      description: pickLocaleText(locale, {
        en: 'Keep English in the main fields and add translated values only when needed.',
        zh: '主字段保留英文；只有需要额外语种时再补充翻译值。',
        ja: '主フィールドは英語のままにし、必要な場合のみ翻訳値を追加します。',
      }),
      helper: pickLocaleText(locale, {
        en: 'Translation management',
        zh: '翻译管理',
        ja: '翻訳管理',
      }),
      title: pickLocaleText(locale, {
        en: 'Translation management',
        zh: '翻译管理',
        ja: '翻訳管理',
      }),
    };

  const translationSections = useMemo(() => {
    const sections: Array<{
      baseValue?: string;
      id: string;
      kind?: 'textarea';
      label: string;
      values: Record<string, string>;
    }> = [
      {
        baseValue: typeof draft.nameEn === 'string' ? draft.nameEn : '',
        id: 'name',
        label: pickLocaleText(locale, {
          en: 'Name',
          zh: '名称',
          ja: '名称',
        }),
        values: managedTranslations.name,
      },
    ];

    if (selectedType !== 'consent') {
      sections.push({
        baseValue: typeof draft.descriptionEn === 'string' ? draft.descriptionEn : '',
        id: 'description',
        kind: 'textarea',
        label: pickLocaleText(locale, {
          en: 'Description',
          zh: '描述',
          ja: '説明',
        }),
        values: managedTranslations.description,
      });
    }

    if (selectedType === 'consent') {
      sections.push({
        baseValue: typeof draft.contentMarkdownEn === 'string' ? draft.contentMarkdownEn : '',
        id: 'content',
        kind: 'textarea',
        label: pickLocaleText(locale, {
          en: 'Consent content',
          zh: '同意内容',
          ja: '同意本文',
        }),
        values: managedTranslations.content,
      });
    }

    return sections;
  }, [
    draft.contentMarkdownEn,
    draft.descriptionEn,
    draft.nameEn,
    locale,
    managedTranslations.content,
    managedTranslations.description,
    managedTranslations.name,
    selectedType,
  ]);

  useEffect(() => {
    setEditorMode('closed');
    setEditorTarget(null);
    setDraft(createEmptyDraft(selectedEntry));
    setManagedTranslations(createEmptyManagedTranslations());
    setIsTranslationsOpen(false);
    setEditorError(null);
  }, [selectedEntry]);

  useEffect(() => {
    if (!supportsLocalScopeOnly && currentScopeOnly) {
      setCurrentScopeOnly(false);
    }
  }, [currentScopeOnly, supportsLocalScopeOnly]);

  useEffect(() => {
    setPage(1);
  }, [effectiveCurrentScopeOnly, includeInactive, search, selectedType]);

  useEffect(() => {
    if (page !== pagination.page) {
      setPage(pagination.page);
    }
  }, [page, pagination.page]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError(null);

      try {
        const response = await listConfigEntitiesPage(requestEnvelope, selectedType, {
          scopeType,
          scopeId,
          includeInherited: !effectiveCurrentScopeOnly,
          includeDisabled: true,
          includeInactive,
          ownerOnly: effectiveCurrentScopeOnly,
          search: search.trim() || undefined,
          page,
          pageSize,
          sort: 'sortOrder',
        });

        if (!cancelled) {
          setRecords(response.items);
          setPagination(response.pagination);
        }
      } catch (reason) {
        if (!cancelled) {
          setRecords([]);
          setPagination(buildPaginationMeta(0, page, pageSize));
          setError(getErrorMessage(reason, resolvedCopy.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [
    effectiveCurrentScopeOnly,
    includeInactive,
    page,
    pageSize,
    refreshTick,
    requestEnvelope,
    resolvedCopy.loadError,
    scopeId,
    scopeType,
    search,
    selectedType,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadParentOptions() {
      if (!selectedEntry.parentType) {
        setParentOptions([]);
        return;
      }

      try {
        const parentRecords = await listAllConfigEntities(requestEnvelope, selectedEntry.parentType, {
          scopeType,
          scopeId,
          includeInherited: true,
          includeDisabled: true,
          includeInactive: true,
          sort: 'sortOrder',
        });

        if (!cancelled) {
          setParentOptions(
            parentRecords.map((record) => ({
              id: record.id,
              name: record.name,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setParentOptions([]);
        }
      }
    }

    void loadParentOptions();

    return () => {
      cancelled = true;
    };
  }, [requestEnvelope, scopeId, scopeType, selectedEntry.parentType]);

  function refreshWorkspace() {
    setRefreshTick((current) => current + 1);
  }

  function updateDraft(key: string, value: DraftValue) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  }

  function beginCreate() {
    setNotice(null);
    setEditorError(null);
    setEditorMode('create');
    setEditorTarget(null);
    setDraft(createEmptyDraft(selectedEntry));
    setManagedTranslations(createEmptyManagedTranslations());
    setIsTranslationsOpen(false);
  }

  function beginEdit(entity: ConfigEntityRecord) {
    setNotice(null);
    setEditorError(null);
    setEditorMode('edit');
    setEditorTarget(entity);
    setDraft(createDraftFromEntity(selectedEntry, entity));
    setManagedTranslations(createManagedTranslationsFromEntity(selectedEntry, entity));
    setIsTranslationsOpen(false);
  }

  function cancelEditor() {
    setEditorMode('closed');
    setEditorTarget(null);
    setEditorError(null);
    setDraft(createEmptyDraft(selectedEntry));
    setManagedTranslations(createEmptyManagedTranslations());
    setIsTranslationsOpen(false);
  }

  async function handleSubmit() {
    const validationError = validateDraft(selectedEntry, draft, resolvedCopy);
    if (validationError) {
      setEditorError(validationError);
      return;
    }

    setEditorPending(true);
    setEditorError(null);
    setNotice(null);

    try {
      if (editorMode === 'edit' && editorTarget) {
        await updateConfigEntity(
          request,
          selectedType,
          editorTarget.id,
          buildUpdatePayload(selectedEntry, draft, editorTarget.version, managedTranslations),
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.updateSuccess(selectedEntry.label, editorTarget.code ?? editorTarget.name),
        });
      } else {
        await createConfigEntity(
          request,
          selectedType,
          buildCreatePayload(selectedEntry, draft, scopeType, scopeId, managedTranslations),
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.createSuccess(selectedEntry.label, (normalizeStringValue(draft.code) || '').toUpperCase()),
        });
      }

      cancelEditor();
      setLoading(true);
      const response = await listConfigEntitiesPage(requestEnvelope, selectedType, {
        scopeType,
        scopeId,
        includeInherited: !effectiveCurrentScopeOnly,
        includeDisabled: true,
        includeInactive,
        ownerOnly: effectiveCurrentScopeOnly,
        search: search.trim() || undefined,
        page,
        pageSize,
        sort: 'sortOrder',
      });
      setRecords(response.items);
      setPagination(response.pagination);
      setLoading(false);
    } catch (reason) {
      setEditorError(getErrorMessage(reason, resolvedCopy.saveError(selectedEntry.label)));
      setLoading(false);
    } finally {
      setEditorPending(false);
    }
  }

  function queueToggle(entity: ConfigEntityRecord) {
    const entityIsInherited = isEntityInheritedInScope(entity, scopeType, selectedType);

    if (entityIsInherited && entity.canDisable && scopeType !== 'tenant' && !isTenantGlobalEntityType(selectedType)) {
      setConfirmState({
        title: entity.isDisabledHere
          ? resolvedCopy.enableInScopeTitle(entity.code ?? entity.name)
          : resolvedCopy.disableInScopeTitle(entity.code ?? entity.name),
        description: entity.isDisabledHere ? resolvedCopy.enableInScopeDescription : resolvedCopy.disableInScopeDescription,
        confirmText: entity.isDisabledHere ? resolvedCopy.enableInScopeConfirm : resolvedCopy.disableInScopeConfirm,
        intent: entity.isDisabledHere ? 'primary' : 'danger',
        entity,
        action: entity.isDisabledHere ? 'enable' : 'disable',
      });
      return;
    }

    if (entityIsInherited) {
      return;
    }

    setConfirmState({
      title: entity.isActive
        ? resolvedCopy.deactivateTitle(entity.code ?? entity.name)
        : resolvedCopy.reactivateTitle(entity.code ?? entity.name),
      description: entity.isActive ? resolvedCopy.deactivateDescription : resolvedCopy.reactivateDescription,
      confirmText: entity.isActive ? resolvedCopy.deactivateConfirm : resolvedCopy.reactivateConfirm,
      intent: entity.isActive ? 'danger' : 'primary',
      entity,
      action: entity.isActive ? 'deactivate' : 'reactivate',
    });
  }

  async function handleConfirmAction() {
    if (!confirmState) {
      return;
    }

    setConfirmPending(true);
    setNotice(null);

    try {
      if (confirmState.action === 'deactivate') {
        await deactivateConfigEntity(request, selectedType, confirmState.entity.id, confirmState.entity.version);
        setNotice({
          tone: 'success',
          message: resolvedCopy.deactivateSuccess(selectedEntry.label, confirmState.entity.code ?? confirmState.entity.name),
        });
      } else if (confirmState.action === 'reactivate') {
        await reactivateConfigEntity(request, selectedType, confirmState.entity.id, confirmState.entity.version);
        setNotice({
          tone: 'success',
          message: resolvedCopy.reactivateSuccess(selectedEntry.label, confirmState.entity.code ?? confirmState.entity.name),
        });
      } else if (confirmState.action === 'disable') {
        if (scopeType === 'tenant' || !scopeId) {
          throw new Error('Inherited records can only be disabled inside subsidiary or talent scopes.');
        }

        await disableInheritedConfigEntity(request, selectedType, confirmState.entity.id, scopeType, scopeId);
        setNotice({
          tone: 'success',
          message: resolvedCopy.disableInScopeSuccess(selectedEntry.label, confirmState.entity.code ?? confirmState.entity.name),
        });
      } else {
        if (scopeType === 'tenant' || !scopeId) {
          throw new Error('Inherited records can only be enabled inside subsidiary or talent scopes.');
        }

        await enableInheritedConfigEntity(request, selectedType, confirmState.entity.id, scopeType, scopeId);
        setNotice({
          tone: 'success',
          message: resolvedCopy.enableInScopeSuccess(selectedEntry.label, confirmState.entity.code ?? confirmState.entity.name),
        });
      }

      const response = await listConfigEntitiesPage(requestEnvelope, selectedType, {
        scopeType,
        scopeId,
        includeInherited: !effectiveCurrentScopeOnly,
        includeDisabled: true,
        includeInactive,
        ownerOnly: effectiveCurrentScopeOnly,
        search: search.trim() || undefined,
        page,
        pageSize,
        sort: 'sortOrder',
      });
      setRecords(response.items);
      setPagination(response.pagination);
      setConfirmState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, resolvedCopy.stateUpdateError(selectedEntry.label)),
      });
    } finally {
      setConfirmPending(false);
    }
  }

  const activeCount = records.filter((record) => record.isActive).length;
  const inheritedCount = records.filter((record) => isEntityInheritedInScope(record, scopeType, selectedType)).length;
  const disabledHereCount = records.filter((record) => record.isDisabledHere).length;
  const pageRange = getPaginationRange(pagination, records.length);
  const paginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${pagination.page} of ${pagination.totalPages}`,
      zh: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
    }),
    range:
      pagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No records are currently visible.',
            zh: '当前没有可显示的记录。',
            ja: '現在表示できるレコードはありません。',
          })
        : pickLocaleText(locale, {
            en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
            zh: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
            ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh: '每页条目',
      ja: '表示件数',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh: '上一页',
      ja: '前へ',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh: '下一页',
      ja: '次へ',
    }),
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(16rem,20rem)_1fr]">
        <div className="space-y-3">
          {CONFIG_ENTITY_ORDER.map((entityType) => {
            const entry = catalog[entityType];
            const isActive = entityType === selectedType;

            return (
              <button
                key={entityType}
                type="button"
                onClick={() => setSelectedType(entityType)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{entry.label}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.type}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{entry.description}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-950">{selectedEntry.label}</p>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{selectedEntry.description}</p>
            </div>
            {canManageSelectedTypeInCurrentScope ? (
              <button
                type="button"
                onClick={beginCreate}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                {resolvedCopy.newRecordLabel}
              </button>
            ) : (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                {pickLocaleText(locale, {
                  en: 'Inherited review only',
                  zh: '仅查看继承结果',
                  ja: '継承確認のみ',
                })}
              </span>
            )}
          </div>

          {notice ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                notice.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{resolvedCopy.visibleRecordsLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{records.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{resolvedCopy.activeLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{resolvedCopy.inheritedLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{inheritedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{resolvedCopy.disabledHereLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{disabledHereCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block min-w-[18rem] flex-1">
                <span className="sr-only">{resolvedCopy.searchLabel}</span>
                <input
                  aria-label={resolvedCopy.searchAriaLabel}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={resolvedCopy.searchPlaceholder(selectedEntry.label)}
                  className="w-full rounded-xl border border-slate-300 bg-white/85 py-2.5 pl-4 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <button
                type="button"
                onClick={refreshWorkspace}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label={resolvedCopy.refreshAriaLabel}
              >
                <RefreshCcw className="h-4 w-4" />
              </button>

              {supportsLocalScopeOnly ? (
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  <input
                    aria-label={resolvedCopy.currentScopeOnlyAriaLabel}
                    type="checkbox"
                    checked={currentScopeOnly}
                    onChange={(event) => setCurrentScopeOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  {resolvedCopy.currentScopeOnlyLabel}
                </label>
              ) : null}

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <input
                  aria-label={resolvedCopy.includeInactiveAriaLabel}
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                {resolvedCopy.includeInactiveLabel}
              </label>
            </div>

            <div className={`mt-3 grid gap-3 ${supportsLocalScopeOnly || inheritedOnlyNotice ? 'lg:grid-cols-2' : ''}`}>
              {supportsLocalScopeOnly ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600">
                  {resolvedCopy.currentScopeOnlyDescription(resolvedCopy.scopeTypeLabel(scopeType))}
                </p>
              ) : null}
              <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600">
                {resolvedCopy.includeInactiveDescription}
              </p>
              {inheritedOnlyNotice ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600">
                  {inheritedOnlyNotice}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <StateView
              status="error"
              title={resolvedCopy.unavailableTitle}
              description={error}
              action={
                <button
                  type="button"
                  onClick={refreshWorkspace}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {resolvedCopy.retryLabel}
                </button>
              }
            />
          ) : (
            <>
              <TableShell
                columns={[
                  resolvedCopy.codeColumn,
                  resolvedCopy.nameColumn,
                  resolvedCopy.scopeStateColumn,
                  resolvedCopy.statusColumn,
                  resolvedCopy.actionsColumn,
                ]}
                dataLength={records.length}
                isLoading={loading}
                isEmpty={!loading && records.length === 0}
                emptyTitle={resolvedCopy.emptyTitle(selectedEntry.label)}
                emptyDescription={
                  !canManageSelectedTypeInCurrentScope
                    ? inheritedOnlyNotice ?? resolvedCopy.emptyFilteredDescription(selectedEntry.label)
                    : effectiveCurrentScopeOnly
                    ? resolvedCopy.emptyOwnedDescription(selectedEntry.label, resolvedCopy.scopeTypeLabel(scopeType))
                    : resolvedCopy.emptyFilteredDescription(selectedEntry.label)
                }
                emptyAction={canManageSelectedTypeInCurrentScope ? (
                  <button
                    type="button"
                    onClick={beginCreate}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    {resolvedCopy.emptyActionLabel}
                  </button>
                ) : undefined}
              >
                {records.map((entity) => {
                  const entityIsInherited = isEntityInheritedInScope(entity, scopeType, selectedType);
                  const canEditOwnedRecord = canManageSelectedTypeInCurrentScope && !entityIsInherited;
                  const canToggleInheritedRecord =
                    entityIsInherited &&
                    entity.canDisable &&
                    scopeType !== 'tenant' &&
                    !isTenantGlobalEntityType(selectedType);

                  return (
                  <tr key={entity.id} className={!entity.isActive ? 'bg-slate-50/80' : undefined}>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <p className="font-mono text-sm font-semibold text-slate-950">{entity.code || resolvedCopy.noCodeLabel}</p>
                        <p className="text-xs leading-5 text-slate-500">{resolvedCopy.createdAtLabel(formatDateTime(locale, entity.createdAt))}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">{entity.name}</p>
                        {entity.description ? <p className="text-sm leading-6 text-slate-600">{entity.description}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {renderScopeSummary(locale, entity, resolvedCopy, scopeType, selectedType)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            entity.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {entity.isActive ? resolvedCopy.activeStatus : resolvedCopy.inactiveStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canEditOwnedRecord ? (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEdit(entity)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              aria-label={`${resolvedCopy.editLabel} ${entity.code ?? entity.name}`}
                            >
                              {resolvedCopy.editLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => queueToggle(entity)}
                              disabled={entity.isSystem}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`${entity.isActive ? resolvedCopy.deactivateLabel : resolvedCopy.reactivateLabel} ${entity.code ?? entity.name}`}
                            >
                              {entity.isActive ? resolvedCopy.deactivateLabel : resolvedCopy.reactivateLabel}
                            </button>
                          </>
                        ) : canToggleInheritedRecord ? (
                          <button
                            type="button"
                            onClick={() => queueToggle(entity)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            aria-label={`${entity.isDisabledHere ? resolvedCopy.enableHereLabel : resolvedCopy.disableHereLabel} ${entity.code ?? entity.name}`}
                          >
                            {entity.isDisabledHere ? resolvedCopy.enableHereLabel : resolvedCopy.disableHereLabel}
                          </button>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {resolvedCopy.inheritedPill}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </TableShell>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{paginationCopy.page}</p>
                  <p className="text-xs text-slate-500">{paginationCopy.range}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{paginationCopy.pageSize}</span>
                    <select
                      aria-label={paginationCopy.pageSize}
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value) as PageSizeOption);
                        setPage(1);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={!pagination.hasPrev || loading}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paginationCopy.previous}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                      disabled={!pagination.hasNext || loading}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paginationCopy.next}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {editorMode !== 'closed' ? (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-950">
                {editorMode === 'create'
                  ? resolvedCopy.editorCreateTitle(selectedEntry.label)
                  : resolvedCopy.editorEditTitle(selectedEntry.label, editorTarget?.code ?? selectedEntry.label)}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                {resolvedCopy.editorDescription(resolvedCopy.scopeTypeLabel(scopeType))}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelEditor}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {resolvedCopy.cancelLabel}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{resolvedCopy.codeLabel}</span>
              <input
                aria-label={resolvedCopy.codeLabel}
                type="text"
                value={typeof draft.code === 'string' ? draft.code : ''}
                onChange={(event) => updateDraft('code', event.target.value.toUpperCase())}
                placeholder="BUSINESS_SEGMENT_A"
                disabled={editorMode === 'edit'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{resolvedCopy.sortOrderLabel}</span>
              <input
                aria-label={resolvedCopy.sortOrderLabel}
                type="number"
                value={typeof draft.sortOrder === 'string' ? draft.sortOrder : '0'}
                onChange={(event) => updateDraft('sortOrder', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">{translationEditorCopy.helper}</p>
                <p className="text-sm leading-6 text-slate-600">{translationEditorCopy.description}</p>
              </div>
              <TranslationManagementTrigger
                count={countManagedLocaleValues(translationSections)}
                onClick={() => setIsTranslationsOpen(true)}
              />
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{resolvedCopy.nameEnglishLabel}</span>
            <input
              aria-label={resolvedCopy.nameEnglishLabel}
              type="text"
              value={typeof draft.nameEn === 'string' ? draft.nameEn : ''}
              onChange={(event) => updateDraft('nameEn', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
          </label>

          {selectedType !== 'consent' ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{resolvedCopy.descriptionEnglishLabel}</span>
              <textarea
                aria-label={resolvedCopy.descriptionEnglishLabel}
                value={typeof draft.descriptionEn === 'string' ? draft.descriptionEn : ''}
                onChange={(event) => updateDraft('descriptionEn', event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
              />
            </label>
          ) : null}

          {selectedEntry.fields.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{resolvedCopy.entitySpecificFieldsTitle}</p>
                <p className="text-sm leading-6 text-slate-600">{resolvedCopy.entitySpecificFieldsDescription}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedEntry.fields.map((field) => renderField(field, draft, parentOptions, updateDraft, resolvedCopy))}
              </div>
            </div>
          ) : null}

          {editorError ? <p className="text-sm font-medium text-red-600">{editorError}</p> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditor}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {resolvedCopy.cancelLabel}
            </button>
            <AsyncSubmitButton
              intent="primary"
              isPending={editorPending}
              onClick={() => void handleSubmit()}
            >
              {editorMode === 'create' ? resolvedCopy.createSubmit : resolvedCopy.saveSubmit}
            </AsyncSubmitButton>
          </div>
        </div>
      ) : null}

      <TranslationManagementDrawer
        open={isTranslationsOpen}
        onOpenChange={setIsTranslationsOpen}
        title={translationEditorCopy.title}
        description={translationEditorCopy.description}
        closeButtonAriaLabel={translationEditorCopy.closeButtonAriaLabel}
        request={request}
        requestEnvelope={requestEnvelope}
        sections={translationSections}
        onChange={(sectionId, localeCode, value) => {
          setManagedTranslations((current) => {
            if (sectionId === 'description') {
              return {
                ...current,
                description: {
                  ...current.description,
                  [localeCode]: value,
                },
              };
            }

            if (sectionId === 'content') {
              return {
                ...current,
                content: {
                  ...current.content,
                  [localeCode]: value,
                },
              };
            }

            return {
              ...current,
              name: {
                ...current.name,
                [localeCode]: value,
              },
            };
          });
        }}
      />

      <ConfirmActionDialog
        open={confirmState !== null}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmText={confirmState?.confirmText}
        intent={confirmState?.intent || 'danger'}
        isPending={confirmPending}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={() => {
          if (!confirmPending) {
            setConfirmState(null);
          }
        }}
      />
    </div>
  );
}
