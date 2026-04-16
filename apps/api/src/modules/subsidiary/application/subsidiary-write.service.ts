// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  assertSubsidiaryVersion,
  buildSubsidiaryPath,
  type SubsidiaryCreateInput,
  type SubsidiaryUpdateInput,
  throwRetiredSubsidiaryMoveError,
} from '../domain/subsidiary-write.policy';
import { SubsidiaryWriteRepository } from '../infrastructure/subsidiary-write.repository';
import { SubsidiaryReadApplicationService } from './subsidiary-read.service';

@Injectable()
export class SubsidiaryWriteApplicationService {
  constructor(
    private readonly subsidiaryWriteRepository: SubsidiaryWriteRepository,
    private readonly subsidiaryReadApplicationService: SubsidiaryReadApplicationService,
  ) {}

  async create(
    tenantSchema: string,
    data: SubsidiaryCreateInput,
    userId: string,
  ) {
    const existing = await this.subsidiaryReadApplicationService.findByCode(
      data.code,
      tenantSchema,
    );

    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Subsidiary code already exists',
      });
    }

    const parent = data.parentId
      ? await this.subsidiaryReadApplicationService.findById(data.parentId, tenantSchema)
      : null;

    if (data.parentId && !parent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Parent subsidiary not found',
      });
    }

    return this.subsidiaryWriteRepository.create(
      tenantSchema,
      {
        ...data,
        ...buildSubsidiaryPath(data.code, parent),
      },
      userId,
    );
  }

  async update(
    id: string,
    tenantSchema: string,
    data: SubsidiaryUpdateInput,
    userId: string,
  ) {
    const current = await this.getSubsidiaryOrThrow(id, tenantSchema);
    assertSubsidiaryVersion(current.version, data.version);

    return this.subsidiaryWriteRepository.update(id, tenantSchema, data, userId);
  }

  async move(
    _id: string,
    _tenantSchema: string,
    _newParentId: string | null,
    _version: number,
    _userId: string,
  ) {
    return throwRetiredSubsidiaryMoveError();
  }

  async deactivate(
    id: string,
    tenantSchema: string,
    cascade: boolean,
    version: number,
    userId: string,
  ): Promise<{ subsidiaries: number; talents: number }> {
    const current = await this.getSubsidiaryOrThrow(id, tenantSchema);
    assertSubsidiaryVersion(current.version, version);

    if (cascade) {
      return this.subsidiaryWriteRepository.deactivateCascade(
        tenantSchema,
        current.path,
        userId,
      );
    }

    await this.subsidiaryWriteRepository.deactivateSingle(id, tenantSchema, userId);

    return {
      subsidiaries: 1,
      talents: 0,
    };
  }

  async reactivate(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string,
  ) {
    const current = await this.getSubsidiaryOrThrow(id, tenantSchema);
    assertSubsidiaryVersion(current.version, version);

    await this.subsidiaryWriteRepository.reactivate(id, tenantSchema, userId);

    const reactivated = await this.subsidiaryReadApplicationService.findById(id, tenantSchema);

    if (!reactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found after reactivation',
      });
    }

    return reactivated;
  }

  private async getSubsidiaryOrThrow(id: string, tenantSchema: string) {
    const subsidiary = await this.subsidiaryReadApplicationService.findById(id, tenantSchema);

    if (!subsidiary) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    return subsidiary;
  }
}
