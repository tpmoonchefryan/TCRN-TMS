'use client';

import { Plus, RefreshCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import type { LocalizedText, SupportedUiLocale } from '@tcrn/shared';

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
import { CustomDomainConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/CustomDomainConfigEntityWorkspace';
import { PublicPresenceAssetWorkspace } from '@/domains/config-dictionary-settings/components/PublicPresenceAssetWorkspace';
import {
  buildLocalizedTextPayload,
  countLocaleValues,
  extractLocalizedTextPayload,
  TranslationManagementDrawer,
  TranslationManagementTrigger,
} from '@/domains/config-dictionary-settings/components/TranslationManagement';
import {
  CONFIG_ENTITY_CATALOG,
  CONFIG_ENTITY_ORDER,
  type ConfigEntityCatalogEntry,
  type ConfigEntityFieldDefinition,
  DEFAULT_CONFIG_ENTITY_TYPE,
} from '@/domains/config-dictionary-settings/components/config-entity-catalog';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import {
  ActionDrawer,
  AsyncSubmitButton,
  ConfirmActionDialog,
  PaginationFooter,
  StateView,
  TableShell,
} from '@/platform/ui';

interface ScopedConfigEntityWorkspaceProps {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  requestEnvelope: RequestEnvelopeFn;
  scopeType: ConfigEntityScopeType;
  scopeId?: string;
  tenantId?: string;
  locale?: SupportedUiLocale;
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

interface LocaleValueDraft {
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
  entityType: ScopedConfigEntityType;
  entry: ConfigEntityCatalogEntry;
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
  nameBaseLabel: string;
  englishNameRequired: string;
  descriptionBaseLabel: string;
  entitySpecificFieldsTitle: string;
  entitySpecificFieldsDescription: string;
  createSubmit: string;
  createPending: string;
  saveSubmit: string;
  savePending: string;
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
  currentScopeOnlyDescription: (scopeLabel) =>
    `Hide inherited records and focus on records maintained at this ${scopeLabel}.`,
  includeInactiveLabel: 'Include inactive records',
  includeInactiveAriaLabel: 'Include inactive records',
  includeInactiveDescription:
    'Keep inactive local records visible so you can review or reactivate them here.',
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
  emptyFilteredDescription: (entryLabel) =>
    `No ${entryLabel.toLowerCase()} records matched the current filters.`,
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
  nameBaseLabel: 'Name base value *',
  englishNameRequired: 'English name is required.',
  descriptionBaseLabel: 'Description base value',
  entitySpecificFieldsTitle: 'Entity-specific fields',
  entitySpecificFieldsDescription: 'Complete the fields required for this entity.',
  createSubmit: 'Create record',
  createPending: 'Creating record…',
  saveSubmit: 'Save changes',
  savePending: 'Saving changes…',
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
  'artist-stage',
  'membership-class',
  'membership-type',
  'membership-level',
  'profile-store',
]);
const CUSTOM_DOMAIN_ENTITY_TYPE: ScopedConfigEntityType = 'custom-domain';
const PUBLIC_PRESENCE_ASSET_ENTITY_TYPES = new Set<ScopedConfigEntityType>([
  'homepage-template-asset',
  'homepage-component-asset',
]);

function isTenantGlobalEntityType(entityType: ScopedConfigEntityType) {
  return TENANT_GLOBAL_ENTITY_TYPES.has(entityType);
}

function isPublicPresenceAssetEntityType(entityType: ScopedConfigEntityType) {
  return PUBLIC_PRESENCE_ASSET_ENTITY_TYPES.has(entityType);
}

function resolvePublicPresenceAssetFamily(entityType: ScopedConfigEntityType) {
  if (entityType === 'homepage-template-asset') {
    return 'template' as const;
  }

  if (entityType === 'homepage-component-asset') {
    return 'component' as const;
  }

  return null;
}

function resolveScopedConfigEntityType(
  catalog: Record<ScopedConfigEntityType, ConfigEntityCatalogEntry>,
  requestedType: string | null
): ScopedConfigEntityType {
  if (requestedType && Object.prototype.hasOwnProperty.call(catalog, requestedType)) {
    return requestedType as ScopedConfigEntityType;
  }

  return DEFAULT_CONFIG_ENTITY_TYPE;
}

function parseConfigEntityBooleanParam(value: string | null) {
  return value === 'true';
}

function buildScopedConfigEntityQueryState(
  searchParams: { toString(): string },
  {
    currentScopeOnly,
    includeInactive,
    page,
    pageSize,
    search,
    selectedType,
  }: {
    currentScopeOnly: boolean;
    includeInactive: boolean;
    page: number;
    pageSize: PageSizeOption;
    search: string;
    selectedType: ScopedConfigEntityType;
  }
) {
  const params = new URLSearchParams(searchParams.toString());
  const normalizedSearch = search.trim();

  params.delete('configEntityType');
  params.delete('configEntitySearch');
  params.delete('configEntityScopeOnly');
  params.delete('configEntityInactive');
  params.delete('configEntityPage');
  params.delete('configEntityPageSize');

  if (selectedType !== DEFAULT_CONFIG_ENTITY_TYPE) {
    params.set('configEntityType', selectedType);
  }

  if (normalizedSearch) {
    params.set('configEntitySearch', normalizedSearch);
  }

  if (currentScopeOnly) {
    params.set('configEntityScopeOnly', 'true');
  }

  if (includeInactive) {
    params.set('configEntityInactive', 'true');
  }

  if (page > 1) {
    params.set('configEntityPage', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('configEntityPageSize', String(pageSize));
  }

  return params.toString();
}

function isEntityInheritedInScope(
  entity: ConfigEntityRecord,
  currentScopeType: ConfigEntityScopeType,
  entityType: ScopedConfigEntityType
) {
  if (isTenantGlobalEntityType(entityType)) {
    return currentScopeType !== 'tenant';
  }

  return entity.isInherited;
}

function resolveEntityOwnerScopeType(
  entity: ConfigEntityRecord,
  entityType: ScopedConfigEntityType
) {
  if (isTenantGlobalEntityType(entityType)) {
    return 'tenant' as const;
  }

  return entity.ownerType ?? 'tenant';
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function formatDateTime(locale: SupportedUiLocale, value: string) {
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
    nameBase: '',
    descriptionBase: '',
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
  nextDraft.nameBase = entity.name.en;
  nextDraft.descriptionBase = entity.description?.en ?? '';
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
      typeof raw === 'string' || typeof raw === 'number'
        ? String(raw)
        : raw == null
          ? ''
          : String(raw);
  });

  return nextDraft;
}

function validateDraft(
  entry: ConfigEntityCatalogEntry,
  draft: ConfigEntityDraft,
  copy: ScopedConfigEntityWorkspaceCopy
) {
  const code = normalizeStringValue(draft.code);
  if (!code || !/^[A-Z0-9_]{3,32}$/.test(code.toUpperCase())) {
    return copy.codeValidation;
  }

  if (!normalizeStringValue(draft.nameBase)) {
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
  localeValues: LocaleValueDraft
): CreateConfigEntityInput {
  const nameBase = normalizeStringValue(draft.nameBase) || '';
  const descriptionBase = normalizeStringValue(draft.descriptionBase);
  const payload: CreateConfigEntityInput = {
    code: (normalizeStringValue(draft.code) || '').toUpperCase(),
    name: buildLocalizedTextPayload(nameBase, localeValues.name),
    description: buildLocalizedTextPayload(descriptionBase, localeValues.description),
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
    const contentMarkdownBase = normalizeStringValue(draft.contentMarkdownBase);

    payload.contentMarkdown = buildLocalizedTextPayload(contentMarkdownBase, localeValues.content);
  }

  return payload;
}

function buildUpdatePayload(
  entry: ConfigEntityCatalogEntry,
  draft: ConfigEntityDraft,
  version: number,
  localeValues: LocaleValueDraft
): UpdateConfigEntityInput {
  const nameBase = normalizeStringValue(draft.nameBase) || '';
  const descriptionBase = normalizeStringValue(draft.descriptionBase);
  const payload: UpdateConfigEntityInput = {
    version,
    name: buildLocalizedTextPayload(nameBase, localeValues.name),
    description: buildLocalizedTextPayload(descriptionBase, localeValues.description),
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
    const contentMarkdownBase = normalizeStringValue(draft.contentMarkdownBase);

    payload.contentMarkdown = buildLocalizedTextPayload(contentMarkdownBase, localeValues.content);
  }

  return payload;
}

function createEmptyLocaleValueDraft(): LocaleValueDraft {
  return {
    content: {},
    description: {},
    name: {},
  };
}

function createLocaleValueDraftFromEntity(
  entry: ConfigEntityCatalogEntry,
  entity: ConfigEntityRecord | null
): LocaleValueDraft {
  if (!entity) {
    return createEmptyLocaleValueDraft();
  }

  return {
    name: extractLocalizedTextPayload(entity.name),
    description: extractLocalizedTextPayload(entity.description ?? undefined),
    content:
      entry.type === 'consent'
        ? extractLocalizedTextPayload(entity.contentMarkdown ?? undefined)
        : {},
  };
}

function renderScopeSummary(
  locale: SupportedUiLocale,
  entity: ConfigEntityRecord,
  copy: ScopedConfigEntityWorkspaceCopy,
  scopeType: ConfigEntityScopeType,
  entityType: ScopedConfigEntityType
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
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase ${scopeTone}`}
        >
          {isInherited
            ? copy.inheritedFromScope(copy.scopeTypeLabel(ownerScopeType))
            : copy.scopeOwned}
        </span>
        {entity.isDisabledHere ? (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-white uppercase">
            {copy.disabledHerePill}
          </span>
        ) : null}
        {entity.isForceUse ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-red-700 uppercase">
            {copy.requiredPill}
          </span>
        ) : null}
        {entity.isSystem ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-slate-600 uppercase">
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
  _copy: ScopedConfigEntityWorkspaceCopy
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
          {field.description ? (
            <p className="text-sm leading-6 text-slate-600">{field.description}</p>
          ) : null}
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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
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

  if (field.kind === 'select') {
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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
        >
          <option value="">{field.placeholder ?? field.label}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.description ? (
          <p className="text-xs leading-5 text-slate-500">{field.description}</p>
        ) : null}
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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
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
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
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
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
      />
      {field.description ? (
        <p className="text-xs leading-5 text-slate-500">{field.description}</p>
      ) : null}
    </label>
  );
}

export function ScopedConfigEntityWorkspace({
  request,
  requestEnvelope,
  scopeType,
  scopeId,
  tenantId,
  locale = 'en',
  copy = DEFAULT_COPY,
  catalog = CONFIG_ENTITY_CATALOG,
}: Readonly<ScopedConfigEntityWorkspaceProps>) {
  const resolvedCopy = copy;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSelectedType = resolveScopedConfigEntityType(
    catalog,
    searchParams.get('configEntityType')
  );
  const urlSelectedTypeSupportsLocalScopeOnly = !isTenantGlobalEntityType(urlSelectedType);
  const urlSearch = searchParams.get('configEntitySearch') ?? '';
  const urlCurrentScopeOnly = urlSelectedTypeSupportsLocalScopeOnly
    ? parseConfigEntityBooleanParam(searchParams.get('configEntityScopeOnly'))
    : false;
  const urlIncludeInactive = parseConfigEntityBooleanParam(
    searchParams.get('configEntityInactive')
  );
  const urlPage = parsePageParam(searchParams.get('configEntityPage'));
  const urlPageSize = parsePageSizeParam(searchParams.get('configEntityPageSize'));
  const [selectedType, setSelectedType] = useState<ScopedConfigEntityType>(urlSelectedType);
  const [records, setRecords] = useState<ConfigEntityRecord[]>([]);
  const recordsTypeRef = useRef<ScopedConfigEntityType | null>(null);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(urlSearch);
  const [includeInactive, setIncludeInactive] = useState(urlIncludeInactive);
  const [currentScopeOnly, setCurrentScopeOnly] = useState(urlCurrentScopeOnly);
  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState<PageSizeOption>(urlPageSize);
  const [pagination, setPagination] = useState<ApiPaginationMeta>(() =>
    buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0])
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const [editorMode, setEditorMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editorTarget, setEditorTarget] = useState<ConfigEntityRecord | null>(null);
  const [draft, setDraft] = useState<ConfigEntityDraft>(() =>
    createEmptyDraft(catalog[DEFAULT_CONFIG_ENTITY_TYPE])
  );
  const [localeValues, setLocaleValues] = useState<LocaleValueDraft>(createEmptyLocaleValueDraft());
  const [isTranslationsOpen, setIsTranslationsOpen] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorPending, setEditorPending] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const selectedEntry = catalog[selectedType];
  const selectedAssetFamily = resolvePublicPresenceAssetFamily(selectedType);
  const supportsLocalScopeOnly = !isTenantGlobalEntityType(selectedType);
  const canManageSelectedTypeInCurrentScope =
    !isTenantGlobalEntityType(selectedType) || scopeType === 'tenant';
  const effectiveCurrentScopeOnly = supportsLocalScopeOnly ? currentScopeOnly : false;
  const inheritedOnlyNotice = !canManageSelectedTypeInCurrentScope
    ? pickLocaleText(locale, {
        en: `${selectedEntry.label} is managed at the tenant scope and can only be reviewed here.`,
        zh_HANS: `${selectedEntry.label} 仅能在租户范围维护，这里只能查看继承结果。`,
        zh_HANT: `${selectedEntry.label} 仅能在租户范围维护，这里只能查看继承结果。`,
        ja: `${selectedEntry.label} はテナントスコープでのみ管理でき、この画面では継承結果の確認のみ可能です。`,
        ko: `${selectedEntry.label} is managed at the tenant scope and can only be reviewed here.`,
        fr: `${selectedEntry.label} is managed at the tenant scope and can only be reviewed here.`,
      })
    : null;
  const translationEditorCopy = {
    closeButtonAriaLabel: pickLocaleText(locale, {
      en: 'Close translation management drawer',
      zh_HANS: '关闭翻译管理抽屉',
      zh_HANT: '关闭翻译管理抽屉',
      ja: '翻訳管理ドロワーを閉じる',
      ko: 'Close translation management drawer',
      fr: 'Close translation management drawer',
    }),
    description: pickLocaleText(locale, {
      en: 'Keep English in the main fields and add translated values only when needed.',
      zh_HANS: '主字段保留英文；只有需要额外语种时再补充翻译值。',
      zh_HANT: '主字段保留英文；只有需要额外语种时再补充翻译值。',
      ja: '主フィールドは英語のままにし、必要な場合のみ翻訳値を追加します。',
      ko: 'Keep English in the main fields and add translated values only when needed.',
      fr: 'Keep English in the main fields and add translated values only when needed.',
    }),
    helper: pickLocaleText(locale, {
      en: 'Translation management',
      zh_HANS: '翻译管理',
      zh_HANT: '翻译管理',
      ja: '翻訳管理',
      ko: 'Translation management',
      fr: 'Translation management',
    }),
    title: pickLocaleText(locale, {
      en: 'Translation management',
      zh_HANS: '翻译管理',
      zh_HANT: '翻译管理',
      ja: '翻訳管理',
      ko: 'Translation management',
      fr: 'Translation management',
    }),
  };
  const editorDrawerCopy = {
    closeButtonAriaLabel: pickLocaleText(locale, {
      en: 'Close configuration record drawer',
      zh_HANS: '关闭配置记录抽屉',
      zh_HANT: '关闭配置记录抽屉',
      ja: '設定レコードドロワーを閉じる',
      ko: 'Close configuration record drawer',
      fr: 'Close configuration record drawer',
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
        baseValue: typeof draft.nameBase === 'string' ? draft.nameBase : '',
        id: 'name',
        label: pickLocaleText(locale, {
          en: 'Name',
          zh_HANS: '名称',
          zh_HANT: '名称',
          ja: '名称',
          ko: 'Name',
          fr: 'Name',
        }),
        values: localeValues.name,
      },
    ];

    if (selectedType !== 'consent') {
      sections.push({
        baseValue: typeof draft.descriptionBase === 'string' ? draft.descriptionBase : '',
        id: 'description',
        kind: 'textarea',
        label: pickLocaleText(locale, {
          en: 'Description',
          zh_HANS: '描述',
          zh_HANT: '描述',
          ja: '説明',
          ko: 'Description',
          fr: 'Description',
        }),
        values: localeValues.description,
      });
    }

    if (selectedType === 'consent') {
      sections.push({
        baseValue: typeof draft.contentMarkdownBase === 'string' ? draft.contentMarkdownBase : '',
        id: 'content',
        kind: 'textarea',
        label: pickLocaleText(locale, {
          en: 'Consent content',
          zh_HANS: '同意内容',
          zh_HANT: '同意内容',
          ja: '同意本文',
          ko: 'Consent content',
          fr: 'Consent content',
        }),
        values: localeValues.content,
      });
    }

    return sections;
  }, [
    draft.contentMarkdownBase,
    draft.descriptionBase,
    draft.nameBase,
    locale,
    localeValues.content,
    localeValues.description,
    localeValues.name,
    selectedType,
  ]);

  useEffect(() => {
    setEditorMode('closed');
    setEditorTarget(null);
    setDraft(createEmptyDraft(selectedEntry));
    setLocaleValues(createEmptyLocaleValueDraft());
    setIsTranslationsOpen(false);
    setEditorError(null);
  }, [selectedEntry]);

  useEffect(() => {
    setSelectedType((current) => (current === urlSelectedType ? current : urlSelectedType));
    setSearch((current) => (current === urlSearch ? current : urlSearch));
    setIncludeInactive((current) =>
      current === urlIncludeInactive ? current : urlIncludeInactive
    );
    setCurrentScopeOnly((current) =>
      current === urlCurrentScopeOnly ? current : urlCurrentScopeOnly
    );
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlCurrentScopeOnly, urlIncludeInactive, urlPage, urlPageSize, urlSearch, urlSelectedType]);

  function applyScopedConfigQueryState(
    nextState: Partial<{
      currentScopeOnly: boolean;
      includeInactive: boolean;
      page: number;
      pageSize: PageSizeOption;
      search: string;
      selectedType: ScopedConfigEntityType;
    }>
  ) {
    const nextSelectedType = resolveScopedConfigEntityType(
      catalog,
      nextState.selectedType !== undefined ? nextState.selectedType : selectedType
    );
    const nextSupportsLocalScopeOnly = !isTenantGlobalEntityType(nextSelectedType);
    const nextCurrentScopeOnly = nextSupportsLocalScopeOnly
      ? (nextState.currentScopeOnly ?? currentScopeOnly)
      : false;
    const nextIncludeInactive = nextState.includeInactive ?? includeInactive;
    const nextSearch = nextState.search ?? search;
    const nextPage = nextState.page ?? page;
    const nextPageSize = nextState.pageSize ?? pageSize;

    if (nextState.selectedType !== undefined) {
      setSelectedType(nextSelectedType);
    }

    if (nextState.currentScopeOnly !== undefined || !nextSupportsLocalScopeOnly) {
      setCurrentScopeOnly(nextCurrentScopeOnly);
    }

    if (nextState.includeInactive !== undefined) {
      setIncludeInactive(nextIncludeInactive);
    }

    if (nextState.search !== undefined) {
      setSearch(nextSearch);
    }

    if (nextState.page !== undefined) {
      setPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setPageSize(nextPageSize);
    }

    const nextQueryString = buildScopedConfigEntityQueryState(searchParams, {
      currentScopeOnly: nextCurrentScopeOnly,
      includeInactive: nextIncludeInactive,
      page: nextPage,
      pageSize: nextPageSize,
      search: nextSearch,
      selectedType: nextSelectedType,
    });
    const currentQueryString = buildScopedConfigEntityQueryState(searchParams, {
      currentScopeOnly: effectiveCurrentScopeOnly,
      includeInactive,
      page,
      pageSize,
      search,
      selectedType,
    });

    if (nextQueryString === currentQueryString) {
      return;
    }

    const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    startTransition(() => {
      router.replace(nextHref);
    });
  }

  useEffect(() => {
    if (!supportsLocalScopeOnly && currentScopeOnly) {
      setCurrentScopeOnly(false);
    }
  }, [currentScopeOnly, supportsLocalScopeOnly]);

  useEffect(() => {
    if (!loading && page !== pagination.page) {
      const nextPage = pagination.page;
      setPage(nextPage);

      const nextQueryString = buildScopedConfigEntityQueryState(searchParams, {
        currentScopeOnly: effectiveCurrentScopeOnly,
        includeInactive,
        page: nextPage,
        pageSize,
        search,
        selectedType,
      });
      const currentQueryString = buildScopedConfigEntityQueryState(searchParams, {
        currentScopeOnly: effectiveCurrentScopeOnly,
        includeInactive,
        page,
        pageSize,
        search,
        selectedType,
      });

      if (nextQueryString !== currentQueryString) {
        const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
        startTransition(() => {
          router.replace(nextHref);
        });
      }
    }
  }, [
    effectiveCurrentScopeOnly,
    includeInactive,
    loading,
    page,
    pageSize,
    pagination.page,
    pathname,
    router,
    search,
    searchParams,
    selectedType,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      if (
        selectedType === CUSTOM_DOMAIN_ENTITY_TYPE ||
        isPublicPresenceAssetEntityType(selectedType)
      ) {
        recordsTypeRef.current = selectedType;
        setRecords([]);
        setPagination(buildPaginationMeta(0, page, pageSize));
        setError(null);
        setLoading(false);
        return;
      }

      const shouldRetainRecords = recordsTypeRef.current === selectedType;
      recordsTypeRef.current = selectedType;

      if (!shouldRetainRecords) {
        setRecords([]);
        setPagination(buildPaginationMeta(0, page, pageSize));
      }

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
      if (selectedType === CUSTOM_DOMAIN_ENTITY_TYPE || !selectedEntry.parentType) {
        setParentOptions([]);
        return;
      }

      try {
        const parentRecords = await listAllConfigEntities(
          requestEnvelope,
          selectedEntry.parentType,
          {
            scopeType,
            scopeId,
            includeInherited: true,
            includeDisabled: true,
            includeInactive: true,
            sort: 'sortOrder',
          }
        );

        if (!cancelled) {
          setParentOptions(
            parentRecords.map((record) => ({
              id: record.id,
              name: record.localizedName,
            }))
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
  }, [requestEnvelope, scopeId, scopeType, selectedEntry.parentType, selectedType]);

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
    setLocaleValues(createEmptyLocaleValueDraft());
    setIsTranslationsOpen(false);
  }

  function beginEdit(entity: ConfigEntityRecord) {
    setNotice(null);
    setEditorError(null);
    setEditorMode('edit');
    setEditorTarget(entity);
    setDraft(createDraftFromEntity(selectedEntry, entity));
    setLocaleValues(createLocaleValueDraftFromEntity(selectedEntry, entity));
    setIsTranslationsOpen(false);
  }

  function cancelEditor() {
    setEditorMode('closed');
    setEditorTarget(null);
    setEditorError(null);
    setDraft(createEmptyDraft(selectedEntry));
    setLocaleValues(createEmptyLocaleValueDraft());
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
          buildUpdatePayload(selectedEntry, draft, editorTarget.version, localeValues)
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.updateSuccess(
            selectedEntry.label,
            editorTarget.code ?? editorTarget.localizedName
          ),
        });
      } else {
        await createConfigEntity(
          request,
          selectedType,
          buildCreatePayload(selectedEntry, draft, scopeType, scopeId, localeValues)
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.createSuccess(
            selectedEntry.label,
            (normalizeStringValue(draft.code) || '').toUpperCase()
          ),
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

    if (
      entityIsInherited &&
      entity.canDisable &&
      scopeType !== 'tenant' &&
      !isTenantGlobalEntityType(selectedType)
    ) {
      setConfirmState({
        title: entity.isDisabledHere
          ? resolvedCopy.enableInScopeTitle(entity.code ?? entity.localizedName)
          : resolvedCopy.disableInScopeTitle(entity.code ?? entity.localizedName),
        description: entity.isDisabledHere
          ? resolvedCopy.enableInScopeDescription
          : resolvedCopy.disableInScopeDescription,
        confirmText: entity.isDisabledHere
          ? resolvedCopy.enableInScopeConfirm
          : resolvedCopy.disableInScopeConfirm,
        intent: entity.isDisabledHere ? 'primary' : 'danger',
        entity,
        entityType: selectedType,
        entry: selectedEntry,
        action: entity.isDisabledHere ? 'enable' : 'disable',
      });
      return;
    }

    if (entityIsInherited) {
      return;
    }

    setConfirmState({
      title: entity.isActive
        ? resolvedCopy.deactivateTitle(entity.code ?? entity.localizedName)
        : resolvedCopy.reactivateTitle(entity.code ?? entity.localizedName),
      description: entity.isActive
        ? resolvedCopy.deactivateDescription
        : resolvedCopy.reactivateDescription,
      confirmText: entity.isActive
        ? resolvedCopy.deactivateConfirm
        : resolvedCopy.reactivateConfirm,
      intent: entity.isActive ? 'danger' : 'primary',
      entity,
      entityType: selectedType,
      entry: selectedEntry,
      action: entity.isActive ? 'deactivate' : 'reactivate',
    });
  }

  async function handleConfirmAction() {
    if (!confirmState) {
      return;
    }

    const actionType = confirmState.entityType;
    const actionEntry = confirmState.entry;

    setConfirmPending(true);
    setNotice(null);

    try {
      if (confirmState.action === 'deactivate') {
        await deactivateConfigEntity(
          request,
          actionType,
          confirmState.entity.id,
          confirmState.entity.version
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.deactivateSuccess(
            actionEntry.label,
            confirmState.entity.code ?? confirmState.entity.localizedName
          ),
        });
      } else if (confirmState.action === 'reactivate') {
        await reactivateConfigEntity(
          request,
          actionType,
          confirmState.entity.id,
          confirmState.entity.version
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.reactivateSuccess(
            actionEntry.label,
            confirmState.entity.code ?? confirmState.entity.localizedName
          ),
        });
      } else if (confirmState.action === 'disable') {
        if (scopeType === 'tenant' || !scopeId) {
          throw new Error(
            'Inherited records can only be disabled inside subsidiary or talent scopes.'
          );
        }

        await disableInheritedConfigEntity(
          request,
          actionType,
          confirmState.entity.id,
          scopeType,
          scopeId
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.disableInScopeSuccess(
            actionEntry.label,
            confirmState.entity.code ?? confirmState.entity.localizedName
          ),
        });
      } else {
        if (scopeType === 'tenant' || !scopeId) {
          throw new Error(
            'Inherited records can only be enabled inside subsidiary or talent scopes.'
          );
        }

        await enableInheritedConfigEntity(
          request,
          actionType,
          confirmState.entity.id,
          scopeType,
          scopeId
        );
        setNotice({
          tone: 'success',
          message: resolvedCopy.enableInScopeSuccess(
            actionEntry.label,
            confirmState.entity.code ?? confirmState.entity.localizedName
          ),
        });
      }

      if (selectedType === actionType) {
        const response = await listConfigEntitiesPage(requestEnvelope, actionType, {
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
      }

      setConfirmState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, resolvedCopy.stateUpdateError(actionEntry.label)),
      });
    } finally {
      setConfirmPending(false);
    }
  }

  const activeCount = records.filter((record) => record.isActive).length;
  const inheritedCount = records.filter((record) =>
    isEntityInheritedInScope(record, scopeType, selectedType)
  ).length;
  const disabledHereCount = records.filter((record) => record.isDisabledHere).length;
  const pageRange = getPaginationRange(pagination, records.length);
  const paginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${pagination.page} of ${pagination.totalPages}`,
      zh_HANS: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      zh_HANT: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
      ko: `Page ${pagination.page} of ${pagination.totalPages}`,
      fr: `Page ${pagination.page} of ${pagination.totalPages}`,
    }),
    range:
      pagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No records are currently visible.',
            zh_HANS: '当前没有可显示的记录。',
            zh_HANT: '当前没有可显示的记录。',
            ja: '現在表示できるレコードはありません。',
            ko: 'No records are currently visible.',
            fr: 'No records are currently visible.',
          })
        : pickLocaleText(locale, {
            en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
            zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
            zh_HANT: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
            ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
            ko: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
            fr: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh_HANS: '每页条目',
      zh_HANT: '每页条目',
      ja: '表示件数',
      ko: 'Rows per page',
      fr: 'Rows per page',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh_HANS: '上一页',
      zh_HANT: '上一页',
      ja: '前へ',
      ko: 'Previous',
      fr: 'Previous',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh_HANS: '下一页',
      zh_HANT: '下一页',
      ja: '次へ',
      ko: 'Next',
      fr: 'Next',
    }),
  };

  if (selectedType === CUSTOM_DOMAIN_ENTITY_TYPE) {
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
                  onClick={() => applyScopedConfigQueryState({ page: 1, selectedType: entityType })}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-sm'
                      : 'border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{entry.label}</p>
                      <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                        {entry.type}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{entry.description}</p>
                </button>
              );
            })}
          </div>

          <CustomDomainConfigEntityWorkspace
            request={request}
            scopeType={scopeType}
            scopeId={scopeId}
            locale={locale}
            search={search}
            currentScopeOnly={effectiveCurrentScopeOnly}
            includeInactive={includeInactive}
            page={page}
            pageSize={pageSize}
            onSearchChange={(value) => applyScopedConfigQueryState({ page: 1, search: value })}
            onCurrentScopeOnlyChange={(value) =>
              applyScopedConfigQueryState({ currentScopeOnly: value, page: 1 })
            }
            onIncludeInactiveChange={(value) =>
              applyScopedConfigQueryState({ includeInactive: value, page: 1 })
            }
            onPageChange={(nextPage) => applyScopedConfigQueryState({ page: nextPage })}
            onPageSizeChange={(nextPageSize) => {
              applyScopedConfigQueryState({
                page: 1,
                pageSize: nextPageSize,
              });
            }}
          />
        </div>
      </div>
    );
  }

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
                onClick={() => applyScopedConfigQueryState({ page: 1, selectedType: entityType })}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{entry.label}</p>
                    <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                      {entry.type}
                    </p>
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
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {selectedEntry.description}
              </p>
            </div>
            {selectedAssetFamily ? null : canManageSelectedTypeInCurrentScope ? (
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
                  zh_HANS: '仅查看继承结果',
                  zh_HANT: '仅查看继承结果',
                  ja: '継承確認のみ',
                  ko: 'Inherited review only',
                  fr: 'Inherited review only',
                })}
              </span>
            )}
          </div>

          {selectedAssetFamily ? (
            <PublicPresenceAssetWorkspace
              families={[selectedAssetFamily]}
              locale={locale}
              request={request}
              scopeId={scopeId ?? null}
              scopeType={scopeType}
              tenantId={tenantId ?? ''}
            />
          ) : (
            <>
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
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    {resolvedCopy.visibleRecordsLabel}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{records.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    {resolvedCopy.activeLabel}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    {resolvedCopy.inheritedLabel}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{inheritedCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    {resolvedCopy.disabledHereLabel}
                  </p>
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
                      onChange={(event) =>
                        applyScopedConfigQueryState({ page: 1, search: event.target.value })
                      }
                      placeholder={resolvedCopy.searchPlaceholder(selectedEntry.label)}
                      className="w-full rounded-xl border border-slate-300 bg-white/85 py-2.5 pr-3 pl-4 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
                        onChange={(event) =>
                          applyScopedConfigQueryState({
                            currentScopeOnly: event.target.checked,
                            page: 1,
                          })
                        }
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
                      onChange={(event) =>
                        applyScopedConfigQueryState({
                          includeInactive: event.target.checked,
                          page: 1,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    {resolvedCopy.includeInactiveLabel}
                  </label>
                </div>

                <div
                  className={`mt-3 grid gap-3 ${supportsLocalScopeOnly || inheritedOnlyNotice ? 'lg:grid-cols-2' : ''}`}
                >
                  {supportsLocalScopeOnly ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600">
                      {resolvedCopy.currentScopeOnlyDescription(
                        resolvedCopy.scopeTypeLabel(scopeType)
                      )}
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
                    ariaLabel={resolvedCopy.visibleRecordsLabel}
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
                        ? (inheritedOnlyNotice ??
                          resolvedCopy.emptyFilteredDescription(selectedEntry.label))
                        : effectiveCurrentScopeOnly
                          ? resolvedCopy.emptyOwnedDescription(
                              selectedEntry.label,
                              resolvedCopy.scopeTypeLabel(scopeType)
                            )
                          : resolvedCopy.emptyFilteredDescription(selectedEntry.label)
                    }
                    emptyAction={
                      canManageSelectedTypeInCurrentScope ? (
                        <button
                          type="button"
                          onClick={beginCreate}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          {resolvedCopy.emptyActionLabel}
                        </button>
                      ) : undefined
                    }
                  >
                    {records.map((entity) => {
                      const entityIsInherited = isEntityInheritedInScope(
                        entity,
                        scopeType,
                        selectedType
                      );
                      const canEditOwnedRecord =
                        canManageSelectedTypeInCurrentScope && !entityIsInherited;
                      const canToggleInheritedRecord =
                        entityIsInherited &&
                        entity.canDisable &&
                        scopeType !== 'tenant' &&
                        !isTenantGlobalEntityType(selectedType);

                      return (
                        <tr
                          key={entity.id}
                          className={!entity.isActive ? 'bg-slate-50/80' : undefined}
                        >
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-2">
                              <p className="font-mono text-sm font-semibold text-slate-950">
                                {entity.code || resolvedCopy.noCodeLabel}
                              </p>
                              <p className="text-xs leading-5 text-slate-500">
                                {resolvedCopy.createdAtLabel(
                                  formatDateTime(locale, entity.createdAt)
                                )}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-950">
                                {entity.localizedName}
                              </p>
                              {entity.localizedDescription ? (
                                <p className="text-sm leading-6 text-slate-600">
                                  {entity.localizedDescription}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            {renderScopeSummary(
                              locale,
                              entity,
                              resolvedCopy,
                              scopeType,
                              selectedType
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase ${
                                  entity.isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {entity.isActive
                                  ? resolvedCopy.activeStatus
                                  : resolvedCopy.inactiveStatus}
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
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 uppercase transition hover:border-slate-300 hover:bg-slate-50"
                                    aria-label={`${resolvedCopy.editLabel} ${entity.code ?? entity.localizedName}`}
                                  >
                                    {resolvedCopy.editLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => queueToggle(entity)}
                                    disabled={entity.isSystem}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 uppercase transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={`${entity.isActive ? resolvedCopy.deactivateLabel : resolvedCopy.reactivateLabel} ${entity.code ?? entity.localizedName}`}
                                  >
                                    {entity.isActive
                                      ? resolvedCopy.deactivateLabel
                                      : resolvedCopy.reactivateLabel}
                                  </button>
                                </>
                              ) : canToggleInheritedRecord ? (
                                <button
                                  type="button"
                                  onClick={() => queueToggle(entity)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 uppercase transition hover:border-slate-300 hover:bg-slate-50"
                                  aria-label={`${entity.isDisabledHere ? resolvedCopy.enableHereLabel : resolvedCopy.disableHereLabel} ${entity.code ?? entity.localizedName}`}
                                >
                                  {entity.isDisabledHere
                                    ? resolvedCopy.enableHereLabel
                                    : resolvedCopy.disableHereLabel}
                                </button>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold tracking-[0.16em] whitespace-nowrap text-slate-500 uppercase">
                                  {resolvedCopy.inheritedPill}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </TableShell>

                  <PaginationFooter
                    pagination={pagination}
                    itemCount={records.length}
                    labels={{
                      pageLabel: paginationCopy.page,
                      rangeLabel: paginationCopy.range,
                      rowsPerPageLabel: paginationCopy.pageSize,
                      pageSizeAriaLabel: paginationCopy.pageSize,
                      previousLabel: paginationCopy.previous,
                      nextLabel: paginationCopy.next,
                    }}
                    onPageChange={(nextPage) => applyScopedConfigQueryState({ page: nextPage })}
                    onPageSizeChange={(nextPageSize) => {
                      applyScopedConfigQueryState({
                        page: 1,
                        pageSize: nextPageSize as PageSizeOption,
                      });
                    }}
                    isLoading={loading}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80"
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ActionDrawer
        open={editorMode !== 'closed'}
        onOpenChange={(open) => {
          if (!open && !editorPending) {
            cancelEditor();
          }
        }}
        title={
          editorMode === 'create'
            ? resolvedCopy.editorCreateTitle(selectedEntry.label)
            : resolvedCopy.editorEditTitle(
                selectedEntry.label,
                editorTarget?.code ?? selectedEntry.label
              )
        }
        description={resolvedCopy.editorDescription(resolvedCopy.scopeTypeLabel(scopeType))}
        size="xl"
        closeButtonAriaLabel={editorDrawerCopy.closeButtonAriaLabel}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditor}
              disabled={editorPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resolvedCopy.cancelLabel}
            </button>
            <AsyncSubmitButton
              intent="primary"
              isPending={editorPending}
              pendingText={
                editorMode === 'create' ? resolvedCopy.createPending : resolvedCopy.savePending
              }
              onClick={() => void handleSubmit()}
            >
              {editorMode === 'create' ? resolvedCopy.createSubmit : resolvedCopy.saveSubmit}
            </AsyncSubmitButton>
          </div>
        }
      >
        <div className="space-y-6">
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
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {resolvedCopy.sortOrderLabel}
              </span>
              <input
                aria-label={resolvedCopy.sortOrderLabel}
                type="number"
                value={typeof draft.sortOrder === 'string' ? draft.sortOrder : '0'}
                onChange={(event) => updateDraft('sortOrder', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">
                  {translationEditorCopy.helper}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {translationEditorCopy.description}
                </p>
              </div>
              <TranslationManagementTrigger
                count={countLocaleValues(translationSections)}
                onClick={() => setIsTranslationsOpen(true)}
              />
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">
              {resolvedCopy.nameBaseLabel}
            </span>
            <input
              aria-label={resolvedCopy.nameBaseLabel}
              type="text"
              value={typeof draft.nameBase === 'string' ? draft.nameBase : ''}
              onChange={(event) => updateDraft('nameBase', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
            />
          </label>

          {selectedType !== 'consent' ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {resolvedCopy.descriptionBaseLabel}
              </span>
              <textarea
                aria-label={resolvedCopy.descriptionBaseLabel}
                value={typeof draft.descriptionBase === 'string' ? draft.descriptionBase : ''}
                onChange={(event) => updateDraft('descriptionBase', event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
              />
            </label>
          ) : null}

          {selectedEntry.fields.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {resolvedCopy.entitySpecificFieldsTitle}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {resolvedCopy.entitySpecificFieldsDescription}
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedEntry.fields.map((field) =>
                  renderField(field, draft, parentOptions, updateDraft, resolvedCopy)
                )}
              </div>
            </div>
          ) : null}

          {editorError ? <p className="text-sm font-medium text-red-600">{editorError}</p> : null}
        </div>
      </ActionDrawer>

      <TranslationManagementDrawer
        open={isTranslationsOpen}
        onOpenChange={setIsTranslationsOpen}
        title={translationEditorCopy.title}
        description={translationEditorCopy.description}
        closeButtonAriaLabel={translationEditorCopy.closeButtonAriaLabel}
        sections={translationSections}
        onChange={(sectionId, localeCode, value) => {
          setLocaleValues((current) => {
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
        confirmText={confirmState?.confirmText ?? resolvedCopy.deactivateConfirm}
        cancelText={resolvedCopy.cancelLabel}
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
