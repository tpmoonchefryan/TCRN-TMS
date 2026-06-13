// SPDX-License-Identifier: Apache-2.0
import { randomBytes, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { ErrorCodes } from '@tcrn/shared';

import {
  assertTenantSendingDomainStatus,
  buildSendingDomainDnsRecords,
  EMAIL_SENDER_PREFERENCES_SETTINGS_KEY,
  EMAIL_SENDING_DOMAINS_SETTINGS_KEY,
  normalizeSendingDomainDomain,
  readStoredSendingDomains,
  readTenantSenderPreferences,
  type StoredTenantSendingDomain,
  type TenantSenderPreferences,
  type TenantSendingDomainStatus,
} from '../domain/tenant-sending-domain.policy';
import type {
  ManagedTenantSendingDomainDto,
  SaveManagedTenantSendingDomainsDto,
  SaveTenantSenderDomainsDto,
} from '../dto/tenant-sending-domain.dto';
import { TenantSendingDomainRepository } from '../infrastructure/tenant-sending-domain.repository';

export interface TenantSendingDomainServiceHelpers {
  now: () => string;
  id: () => string;
  token: () => string;
}

export interface ManagedTenantSendingDomainResponse {
  tenantId: string;
  domains: Array<Omit<StoredTenantSendingDomain, 'verificationToken'>>;
  defaultDomainId: string | null;
}

export interface TenantSenderDomainOption {
  id: string;
  domain: string;
  status: TenantSendingDomainStatus;
  selectable: boolean;
}

export interface TenantSenderDomainsResponse extends TenantSenderPreferences {
  domains: TenantSenderDomainOption[];
}

const DEFAULT_HELPERS: TenantSendingDomainServiceHelpers = {
  now: () => new Date().toISOString(),
  id: () => randomUUID(),
  token: () => randomBytes(16).toString('hex'),
};

@Injectable()
export class TenantSendingDomainService {
  constructor(
    private readonly repository: TenantSendingDomainRepository,
    @Optional() private readonly helpers: TenantSendingDomainServiceHelpers = DEFAULT_HELPERS
  ) {}

  async getManagedTenantSendingDomains(
    tenantId: string
  ): Promise<ManagedTenantSendingDomainResponse> {
    const tenant = await this.repository.findTenantById(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return this.buildManagedResponse(tenant.id, tenant.settings ?? {});
  }

  async saveManagedTenantSendingDomains(
    tenantId: string,
    input: SaveManagedTenantSendingDomainsDto
  ): Promise<ManagedTenantSendingDomainResponse> {
    const tenant = await this.repository.findTenantById(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const existing = readStoredSendingDomains(tenant.settings);
    const nextDomains = this.normalizeManagedDomains(input.domains, existing);
    const existingPreferences = readTenantSenderPreferences(tenant.settings);
    const nextDefaultDomainId = this.resolveDefaultDomainId(
      input.defaultDomainId,
      existingPreferences.defaultDomainId,
      nextDomains
    );
    const nextSettings = {
      ...(tenant.settings ?? {}),
      [EMAIL_SENDING_DOMAINS_SETTINGS_KEY]: nextDomains,
      [EMAIL_SENDER_PREFERENCES_SETTINGS_KEY]: {
        ...existingPreferences,
        defaultDomainId: nextDefaultDomainId,
      },
    };

    await this.repository.updateTenantSettings(tenant.id, nextSettings);

    return this.buildManagedResponse(tenant.id, nextSettings);
  }

  async getTenantSenderSelection(tenantSchema: string): Promise<TenantSenderDomainsResponse> {
    const tenant = await this.repository.findTenantBySchema(tenantSchema);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return this.buildTenantResponse(tenant.settings ?? {});
  }

  async saveTenantSenderSelection(
    tenantSchema: string,
    input: SaveTenantSenderDomainsDto
  ): Promise<TenantSenderDomainsResponse> {
    const tenant = await this.repository.findTenantBySchema(tenantSchema);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const settings = tenant.settings ?? {};
    const domains = readStoredSendingDomains(settings);
    const existingPreferences = readTenantSenderPreferences(settings);
    const defaultDomainId = this.normalizeNullableString(
      input.defaultDomainId ?? existingPreferences.defaultDomainId
    );

    if (defaultDomainId) {
      const selected = domains.find((domain) => domain.id === defaultDomainId);

      if (!selected || selected.status !== 'verified') {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Default sending domain must be assigned and verified.',
        });
      }
    }

    const nextPreferences: TenantSenderPreferences = {
      defaultDomainId,
      fromName: this.normalizeNullableString(input.fromName ?? existingPreferences.fromName),
      replyTo: this.normalizeNullableString(input.replyTo ?? existingPreferences.replyTo),
    };
    const nextSettings = {
      ...settings,
      [EMAIL_SENDER_PREFERENCES_SETTINGS_KEY]: nextPreferences,
    };

    await this.repository.updateTenantSettings(tenant.id, nextSettings);

    return this.buildTenantResponse(nextSettings);
  }

  private normalizeManagedDomains(
    inputDomains: ManagedTenantSendingDomainDto[],
    existingDomains: StoredTenantSendingDomain[]
  ): StoredTenantSendingDomain[] {
    const existingById = new Map(existingDomains.map((domain) => [domain.id, domain]));
    const existingByDomain = new Map(existingDomains.map((domain) => [domain.domain, domain]));
    const seenDomains = new Set<string>();

    return inputDomains.map((inputDomain) => {
      const domain = normalizeSendingDomainDomain(inputDomain.domain);
      if (seenDomains.has(domain)) {
        throw new BadRequestException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: 'Sending domain is duplicated.',
        });
      }
      seenDomains.add(domain);

      const status = inputDomain.status ?? 'pending_dns';
      assertTenantSendingDomainStatus(status);

      const existing = inputDomain.id
        ? existingById.get(inputDomain.id)
        : existingByDomain.get(domain);
      const verificationToken = existing?.verificationToken ?? this.helpers.token();
      const now = this.helpers.now();

      return {
        id: existing?.id ?? inputDomain.id ?? this.helpers.id(),
        domain,
        status,
        verificationToken,
        dnsRecords: buildSendingDomainDnsRecords(domain, verificationToken),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
    });
  }

  private resolveDefaultDomainId(
    inputDefaultDomainId: string | null | undefined,
    existingDefaultDomainId: string | null,
    domains: StoredTenantSendingDomain[]
  ): string | null {
    const requestedDefaultDomainId =
      inputDefaultDomainId === undefined
        ? existingDefaultDomainId
        : this.normalizeNullableString(inputDefaultDomainId);

    if (!requestedDefaultDomainId) {
      return null;
    }

    const selected = domains.find((domain) => domain.id === requestedDefaultDomainId);
    return selected?.status === 'verified' ? selected.id : null;
  }

  private buildManagedResponse(
    tenantId: string,
    settings: Record<string, unknown>
  ): ManagedTenantSendingDomainResponse {
    const domains = readStoredSendingDomains(settings).map(
      ({ verificationToken: _verificationToken, ...domain }) => domain
    );
    const preferences = readTenantSenderPreferences(settings);
    const defaultDomain = domains.find((domain) => domain.id === preferences.defaultDomainId);

    return {
      tenantId,
      domains,
      defaultDomainId: defaultDomain?.status === 'verified' ? defaultDomain.id : null,
    };
  }

  private buildTenantResponse(settings: Record<string, unknown>): TenantSenderDomainsResponse {
    const domains = readStoredSendingDomains(settings);
    const preferences = readTenantSenderPreferences(settings);
    const defaultDomain = domains.find((domain) => domain.id === preferences.defaultDomainId);

    return {
      domains: domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        selectable: domain.status === 'verified',
      })),
      defaultDomainId: defaultDomain?.status === 'verified' ? defaultDomain.id : null,
      fromName: preferences.fromName,
      replyTo: preferences.replyTo,
    };
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  }
}
