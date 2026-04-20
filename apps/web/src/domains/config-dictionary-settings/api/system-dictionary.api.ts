import type { SupportedUiLocale } from '@tcrn/shared';

import {
  type ApiSuccessEnvelope,
  type PaginatedResult,
  resolveApiPagination,
} from '@/platform/http/api';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
export type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

function withLocaleHeaders(locale?: string, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  if (locale) {
    nextHeaders.set('Accept-Language', locale);
  }

  return nextHeaders;
}

export interface DictionaryTypeSummary {
  type: string;
  name: string;
  description: string | null;
  count: number;
}

export interface DictionaryItemRecord {
  id: string;
  dictionaryCode: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  name: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  descriptionTranslations: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
  extraData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateDictionaryTypeInput {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  translations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  extraData?: Record<string, unknown>;
  sortOrder?: number;
}

export interface CreateDictionaryItemInput {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  translations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  sortOrder?: number;
  extraData?: Record<string, unknown>;
}

export interface UpdateDictionaryItemInput extends Omit<CreateDictionaryItemInput, 'code'> {
  version: number;
}

export interface ToggleDictionaryItemInput {
  version: number;
}

export interface ListDictionaryItemsOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

function buildJsonRequestInit(
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  headers?: HeadersInit,
): RequestInit {
  const nextHeaders = new Headers(headers);

  if (body !== undefined) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  return {
    method,
    headers: nextHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function listDictionaryTypes(request: RequestFn, locale?: SupportedUiLocale) {
  return request<DictionaryTypeSummary[]>('/api/v1/system-dictionary', {
    headers: locale
      ? {
          'Accept-Language': locale,
        }
      : undefined,
  });
}

export async function listDictionaryItems(
  requestEnvelope: RequestEnvelopeFn,
  type: string,
  options: ListDictionaryItemsOptions = {},
  locale?: string,
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query = buildQueryString({
    search: options.search,
    includeInactive: options.includeInactive,
    page,
    pageSize,
  });

  const envelope = await requestEnvelope<DictionaryItemRecord[]>(
    `/api/v1/system-dictionary/${encodeURIComponent(type)}${query}`,
    {
      headers: withLocaleHeaders(locale),
    },
  );

  return {
    items: envelope.data,
    pagination: resolveApiPagination(envelope.meta, page, pageSize, envelope.data.length),
  } satisfies PaginatedResult<DictionaryItemRecord>;
}

export function createDictionaryType(request: RequestFn, input: CreateDictionaryTypeInput) {
  return request<{
    id: string;
    code: string;
    nameEn: string;
    nameZh: string | null;
    nameJa: string | null;
    translations: Record<string, string>;
    descriptionEn: string | null;
    descriptionZh: string | null;
    descriptionJa: string | null;
    descriptionTranslations: Record<string, string>;
    extraData: Record<string, unknown> | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    version: number;
  }>('/api/v1/system-dictionary', buildJsonRequestInit('POST', input));
}

export function createDictionaryItem(
  request: RequestFn,
  type: string,
  input: CreateDictionaryItemInput,
) {
  return request<DictionaryItemRecord>(
    `/api/v1/system-dictionary/${encodeURIComponent(type)}/items`,
    buildJsonRequestInit('POST', input),
  );
}

export function updateDictionaryItem(
  request: RequestFn,
  type: string,
  itemId: string,
  input: UpdateDictionaryItemInput,
) {
  return request<DictionaryItemRecord>(
    `/api/v1/system-dictionary/${encodeURIComponent(type)}/items/${encodeURIComponent(itemId)}`,
    buildJsonRequestInit('PATCH', input),
  );
}

export function deactivateDictionaryItem(
  request: RequestFn,
  type: string,
  itemId: string,
  input: ToggleDictionaryItemInput,
) {
  return request<DictionaryItemRecord>(
    `/api/v1/system-dictionary/${encodeURIComponent(type)}/items/${encodeURIComponent(itemId)}`,
    buildJsonRequestInit('DELETE', input),
  );
}

export function reactivateDictionaryItem(
  request: RequestFn,
  type: string,
  itemId: string,
  input: ToggleDictionaryItemInput,
) {
  return request<DictionaryItemRecord>(
    `/api/v1/system-dictionary/${encodeURIComponent(type)}/items/${encodeURIComponent(itemId)}/reactivate`,
    buildJsonRequestInit('POST', input),
  );
}
