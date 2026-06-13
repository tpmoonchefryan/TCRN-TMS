// SPDX-License-Identifier: Apache-2.0
import { BadRequestException } from '@nestjs/common';

import { ErrorCodes } from '@tcrn/shared';

export const EMAIL_SENDING_DOMAINS_SETTINGS_KEY = 'emailSendingDomains';
export const EMAIL_SENDER_PREFERENCES_SETTINGS_KEY = 'emailSenderPreferences';

export const TENANT_SENDING_DOMAIN_STATUSES = ['pending_dns', 'verified', 'disabled'] as const;

export type TenantSendingDomainStatus = (typeof TENANT_SENDING_DOMAIN_STATUSES)[number];

export interface TenantSendingDomainDnsRecord {
  type: 'TXT';
  host: string;
  value: string;
}

export interface StoredTenantSendingDomain {
  id: string;
  domain: string;
  status: TenantSendingDomainStatus;
  verificationToken: string;
  dnsRecords: TenantSendingDomainDnsRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantSenderPreferences {
  defaultDomainId: string | null;
  fromName: string | null;
  replyTo: string | null;
}

export interface TenantRecordWithEmailSettings {
  id: string;
  schemaName: string;
  settings: Record<string, unknown> | null;
}

export function normalizeSendingDomainDomain(domain: string): string {
  const normalized = domain.trim().toLowerCase();

  if (
    !normalized ||
    normalized.includes('://') ||
    /\s/.test(normalized) ||
    !normalized.includes('.')
  ) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Sending domain must be a hostname.',
    });
  }

  return normalized;
}

export function assertTenantSendingDomainStatus(
  status: string
): asserts status is TenantSendingDomainStatus {
  if (!TENANT_SENDING_DOMAIN_STATUSES.includes(status as TenantSendingDomainStatus)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Sending domain status is not supported.',
    });
  }
}

export function buildSendingDomainDnsRecords(
  domain: string,
  verificationToken: string
): TenantSendingDomainDnsRecord[] {
  return [
    {
      type: 'TXT',
      host: `_tcrn-email.${domain}`,
      value: `tcrn-email-verification=${verificationToken}`,
    },
  ];
}

export function readStoredSendingDomains(
  settings: Record<string, unknown> | null
): StoredTenantSendingDomain[] {
  const raw = settings?.[EMAIL_SENDING_DOMAINS_SETTINGS_KEY];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item): StoredTenantSendingDomain[] => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<StoredTenantSendingDomain>;
    if (
      typeof record.id !== 'string' ||
      typeof record.domain !== 'string' ||
      typeof record.status !== 'string' ||
      typeof record.verificationToken !== 'string' ||
      typeof record.createdAt !== 'string' ||
      typeof record.updatedAt !== 'string'
    ) {
      return [];
    }

    if (!TENANT_SENDING_DOMAIN_STATUSES.includes(record.status as TenantSendingDomainStatus)) {
      return [];
    }

    try {
      const domain = normalizeSendingDomainDomain(record.domain);

      return [
        {
          id: record.id,
          domain,
          status: record.status as TenantSendingDomainStatus,
          verificationToken: record.verificationToken,
          dnsRecords: buildSendingDomainDnsRecords(domain, record.verificationToken),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function readTenantSenderPreferences(
  settings: Record<string, unknown> | null
): TenantSenderPreferences {
  const raw = settings?.[EMAIL_SENDER_PREFERENCES_SETTINGS_KEY];

  if (!raw || typeof raw !== 'object') {
    return {
      defaultDomainId: null,
      fromName: null,
      replyTo: null,
    };
  }

  const record = raw as Partial<TenantSenderPreferences>;

  return {
    defaultDomainId: typeof record.defaultDomainId === 'string' ? record.defaultDomainId : null,
    fromName: typeof record.fromName === 'string' ? record.fromName : null,
    replyTo: typeof record.replyTo === 'string' ? record.replyTo : null,
  };
}
