// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { canAccessRequestedTenant } from '../domain/tenant-read.policy';
import { TenantReadRepository } from '../infrastructure/tenant-read.repository';

@Injectable()
export class TenantReadService {
  constructor(
    private readonly tenantReadRepository: TenantReadRepository,
  ) {}

  async getTenantByCode(code: string) {
    const tenant = await this.tenantReadRepository.findByCode(code);

    if (tenant) {
      return tenant;
    }

    return this.tenantReadRepository.findByCodeInsensitive(code);
  }

  getTenantById(id: string) {
    return this.tenantReadRepository.findById(id);
  }

  getTenantBySchemaName(schemaName: string) {
    return this.tenantReadRepository.findBySchemaName(schemaName);
  }

  listActiveTenants() {
    return this.tenantReadRepository.listActiveTenants();
  }

  async validateTenantAccess(tenantId: string, requestedTenantId: string): Promise<boolean> {
    if (!canAccessRequestedTenant(tenantId, requestedTenantId)) {
      return false;
    }

    const tenant = await this.tenantReadRepository.findById(tenantId);
    return tenant?.isActive === true;
  }
}
