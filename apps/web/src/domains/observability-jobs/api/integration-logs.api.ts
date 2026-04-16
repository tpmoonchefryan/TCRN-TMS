// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { format, formatDistanceToNow, type Locale } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';

import {
  type IntegrationLogListPayload,
  type IntegrationLogRecord,
  logApi,
} from '@/lib/api/modules/security';

const STATUS_COLORS: Record<string, string> = {
  '2xx': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  '3xx': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  '4xx': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  '5xx': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const DATE_LOCALES: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
  ja: ja,
};

export interface BusinessIntegrationLogsQuery {
  direction?: string;
  statusFilter?: string;
  page: number;
  pageSize: number;
}

export function getIntegrationLogStatusColor(status: number | null | undefined): string {
  if (!status) {
    return 'bg-gray-100 text-gray-800';
  }

  if (status >= 200 && status < 300) {
    return STATUS_COLORS['2xx'];
  }

  if (status >= 300 && status < 400) {
    return STATUS_COLORS['3xx'];
  }

  if (status >= 400 && status < 500) {
    return STATUS_COLORS['4xx'];
  }

  if (status >= 500) {
    return STATUS_COLORS['5xx'];
  }

  return 'bg-gray-100 text-gray-800';
}

export function formatIntegrationLogPreciseTime(locale: string, dateStr: string): string {
  const dateLocale = DATE_LOCALES[locale] || enUS;
  return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss', { locale: dateLocale });
}

export function formatIntegrationLogRelativeTime(locale: string, dateStr: string): string {
  const dateLocale = DATE_LOCALES[locale] || enUS;
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: dateLocale });
}

export const businessIntegrationLogsApi = {
  list: async (
    query: BusinessIntegrationLogsQuery,
  ): Promise<IntegrationLogListPayload> => {
    const response = await logApi.getIntegrationLogs({
      direction: query.direction || undefined,
      status: query.statusFilter || undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    if (!response.success || !response.data) {
      const error = new Error(response.error?.message || '');
      (error as Error & { code: string }).code = 'INTEGRATION_LOGS_LOAD_FAILED';
      throw error;
    }

    return response.data;
  },
};

export type { IntegrationLogRecord };
