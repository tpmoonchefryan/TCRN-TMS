// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  type CustomerArchiveAccessRecord,
  hasActiveArchiveTarget,
  type TalentArchiveReadiness,
} from '../domain/customer-archive.policy';
import { type ProfileType } from '../dto/customer.dto';
import { CustomerArchiveRepository } from '../infrastructure/customer-archive.repository';

@Injectable()
export class CustomerArchiveAccessService {
  constructor(
    private readonly customerArchiveRepository: CustomerArchiveRepository,
  ) {}

  async requireTalentArchiveTarget(
    talentId: string,
    context: RequestContext,
    options?: {
      missingTalentMessage?: string;
      missingArchiveMessage?: string;
    },
  ): Promise<{ talentId: string; profileStoreId: string }> {
    const binding = await this.customerArchiveRepository.findTalentArchiveBinding(
      context.tenantSchema,
      talentId,
    );

    if (!binding) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: options?.missingTalentMessage ?? 'Talent not found',
      });
    }

    if (!binding.profileStoreId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message:
          options?.missingArchiveMessage ?? 'Talent has no profile store configured',
      });
    }

    return {
      talentId: binding.id,
      profileStoreId: binding.profileStoreId,
    };
  }

  async getTalentArchiveReadiness(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentArchiveReadiness> {
    const binding = await this.customerArchiveRepository.findTalentArchiveBinding(
      tenantSchema,
      talentId,
    );

    return {
      talentId,
      hasArchiveTarget: Boolean(binding?.profileStoreId),
      hasActiveArchiveTarget: hasActiveArchiveTarget(binding),
    };
  }

  async requireCustomerArchiveAccess(
    customerId: string,
    talentId: string,
    context: RequestContext,
    options?: {
      expectedProfileType?: ProfileType;
      notFoundMessage?: string;
    },
  ): Promise<CustomerArchiveAccessRecord> {
    const customer = await this.customerArchiveRepository.findCustomerArchiveAccess(
      context.tenantSchema,
      customerId,
      talentId,
    );

    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: options?.notFoundMessage ?? 'Customer not found',
      });
    }

    if (
      options?.expectedProfileType &&
      customer.profileType !== options.expectedProfileType
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Customer is not a ${options.expectedProfileType} profile`,
      });
    }

    return customer;
  }
}
