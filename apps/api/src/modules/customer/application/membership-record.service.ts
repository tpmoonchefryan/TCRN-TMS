// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
  buildMembershipRecordCreateChangeLogDiff,
  buildMembershipRecordCreateResult,
  buildMembershipRecordObjectName,
  buildMembershipRecordUpdateChangeLogDiff,
  buildMembershipRecordUpdateResult,
  buildMembershipSummaryResult,
  mapMembershipRecordListItem,
} from '../domain/membership-record.policy';
import type {
  CreateMembershipDto,
  MembershipListQueryDto,
  UpdateMembershipDto,
} from '../dto/customer.dto';
import { MembershipRecordRepository } from '../infrastructure/membership-record.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';

@Injectable()
export class MembershipRecordApplicationService {
  constructor(
    private readonly membershipRecordRepository: MembershipRecordRepository,
    private readonly databaseService: DatabaseService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
  ) {}

  async findByCustomer(
    customerId: string,
    talentId: string,
    query: MembershipListQueryDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const pagination = this.databaseService.buildPagination(page, pageSize);
    const [items, total, activeCount, expiredCount] = await Promise.all([
      this.membershipRecordRepository.findByCustomer(context.tenantSchema, {
        customerId,
        platformCode: query.platformCode,
        isActive: query.isActive,
        includeExpired: query.includeExpired ?? false,
        sort: query.sort,
        take: pagination.take,
        skip: pagination.skip,
      }),
      this.membershipRecordRepository.countByCustomer(context.tenantSchema, {
        customerId,
        platformCode: query.platformCode,
        isActive: query.isActive,
        includeExpired: query.includeExpired ?? false,
      }),
      this.membershipRecordRepository.countActiveByCustomer(
        context.tenantSchema,
        customerId,
      ),
      this.membershipRecordRepository.countExpiredByCustomer(
        context.tenantSchema,
        customerId,
      ),
    ]);

    return {
      items: items.map((item) => mapMembershipRecordListItem(item)),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
        summary: {
          activeCount,
          expiredCount,
          totalCount: activeCount + expiredCount,
        },
      },
    };
  }

  async create(
    customerId: string,
    talentId: string,
    dto: CreateMembershipDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const platform = await this.membershipRecordRepository.findActivePlatformByCode(
      context.tenantSchema,
      dto.platformCode,
    );

    if (!platform) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform not found',
      });
    }

    const membershipLevel = await this.membershipRecordRepository.findActiveMembershipLevelByCode(
      context.tenantSchema,
      dto.membershipLevelCode,
    );

    if (!membershipLevel) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Membership level not found',
      });
    }

    const created = await this.membershipRecordRepository.create(
      context.tenantSchema,
      {
        customerId,
        platformId: platform.id,
        membershipClassId: membershipLevel.membershipClassId,
        membershipTypeId: membershipLevel.membershipTypeId,
        membershipLevelId: membershipLevel.id,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        autoRenew: dto.autoRenew ?? false,
        note: dto.note ?? null,
        userId: context.userId,
      },
    );

    await this.membershipRecordRepository.insertChangeLog(context.tenantSchema, {
      action: 'create',
      objectId: created.id,
      objectName: buildMembershipRecordObjectName(
        platform.code,
        membershipLevel.code,
      ),
      diff: buildMembershipRecordCreateChangeLogDiff({
        platformCode: platform.code,
        membershipLevelCode: membershipLevel.code,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      }),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    return buildMembershipRecordCreateResult(created, platform, membershipLevel);
  }

  async update(
    customerId: string,
    recordId: string,
    talentId: string,
    dto: UpdateMembershipDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const record = await this.membershipRecordRepository.findOwnedRecord(
      context.tenantSchema,
      customerId,
      recordId,
    );

    if (!record) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Membership record not found',
      });
    }

    const updated = await this.membershipRecordRepository.update(
      context.tenantSchema,
      recordId,
      {
        validTo: dto.validTo !== undefined
          ? (dto.validTo ? new Date(dto.validTo) : null)
          : record.validTo,
        autoRenew: dto.autoRenew ?? record.autoRenew,
        note: dto.note ?? record.note,
        userId: context.userId,
      },
    );

    await this.membershipRecordRepository.insertChangeLog(context.tenantSchema, {
      action: 'update',
      objectId: recordId,
      objectName: buildMembershipRecordObjectName(
        record.platformCode,
        record.levelCode,
      ),
      diff: buildMembershipRecordUpdateChangeLogDiff(record, updated),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    return buildMembershipRecordUpdateResult(updated);
  }

  async getSummary(customerId: string, context: RequestContext) {
    const [highestLevel, activeCount, totalCount] = await Promise.all([
      this.membershipRecordRepository.findHighestActiveSummary(
        context.tenantSchema,
        customerId,
      ),
      this.membershipRecordRepository.countActiveByCustomer(
        context.tenantSchema,
        customerId,
      ),
      this.membershipRecordRepository.countTotalByCustomer(
        context.tenantSchema,
        customerId,
      ),
    ]);

    return buildMembershipSummaryResult(highestLevel, {
      activeCount,
      totalCount,
    });
  }

  private async verifyCustomerAccess(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerArchiveAccessService.requireCustomerArchiveAccess(
      customerId,
      talentId,
      context,
    );
  }
}
