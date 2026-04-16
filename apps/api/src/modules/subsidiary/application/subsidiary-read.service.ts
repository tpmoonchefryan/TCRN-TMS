// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import {
  buildSubsidiaryListQuery,
  type SubsidiaryListOptions,
} from '../domain/subsidiary-read.policy';
import { SubsidiaryReadRepository } from '../infrastructure/subsidiary-read.repository';

@Injectable()
export class SubsidiaryReadApplicationService {
  constructor(
    private readonly subsidiaryReadRepository: SubsidiaryReadRepository,
  ) {}

  findById(id: string, tenantSchema: string) {
    return this.subsidiaryReadRepository.findById(id, tenantSchema);
  }

  findByCode(code: string, tenantSchema: string) {
    return this.subsidiaryReadRepository.findByCode(code, tenantSchema);
  }

  async list(
    tenantSchema: string,
    options: SubsidiaryListOptions = {},
  ) {
    const query = buildSubsidiaryListQuery(options);
    const data = await this.subsidiaryReadRepository.list(tenantSchema, query);
    const total = await this.subsidiaryReadRepository.count(tenantSchema, query);

    return { data, total };
  }

  getChildrenCount(id: string, tenantSchema: string) {
    return this.subsidiaryReadRepository.getChildrenCount(id, tenantSchema);
  }

  getTalentCount(id: string, tenantSchema: string) {
    return this.subsidiaryReadRepository.getTalentCount(id, tenantSchema);
  }
}
