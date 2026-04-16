// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
  buildPlatformIdentityCreateChangeLogDiff,
  buildPlatformIdentityCreateResult,
  buildPlatformIdentityObjectName,
  buildPlatformIdentityUpdateChangeLogDiff,
  buildPlatformIdentityUpdateInput,
  buildPlatformIdentityUpdateResult,
  collectPlatformIdentityChanges,
  mapPlatformIdentityHistoryRecord,
  mapPlatformIdentityListRecord,
} from '../domain/platform-identity.policy';
import type {
  CreatePlatformIdentityDto,
  PlatformIdentityHistoryQueryDto,
  UpdatePlatformIdentityDto,
} from '../dto/customer.dto';
import { PlatformIdentityRepository } from '../infrastructure/platform-identity.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';

@Injectable()
export class PlatformIdentityApplicationService {
  constructor(
    private readonly platformIdentityRepository: PlatformIdentityRepository,
    private readonly databaseService: DatabaseService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
  ) {}

  async findByCustomer(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const identities = await this.platformIdentityRepository.findByCustomer(
      context.tenantSchema,
      customerId,
    );

    return identities.map((identity) => mapPlatformIdentityListRecord(identity));
  }

  async create(
    customerId: string,
    talentId: string,
    dto: CreatePlatformIdentityDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const platform = await this.platformIdentityRepository.findActivePlatformByCode(
      context.tenantSchema,
      dto.platformCode,
    );

    if (!platform) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform not found',
      });
    }

    const existing = await this.platformIdentityRepository.findDuplicateIdentity(
      context.tenantSchema,
      customerId,
      platform.id,
      dto.platformUid,
    );

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Platform identity already exists',
      });
    }

    const created = await this.platformIdentityRepository.create(context.tenantSchema, {
      customerId,
      platformId: platform.id,
      platformUid: dto.platformUid,
      platformNickname: dto.platformNickname ?? null,
      platformAvatarUrl: dto.platformAvatarUrl ?? null,
      profileUrl: platform.profileUrlTemplate
        ? platform.profileUrlTemplate.replace('{uid}', dto.platformUid)
        : null,
      isVerified: dto.isVerified ?? false,
    });

    await this.platformIdentityRepository.insertHistory(context.tenantSchema, {
      identityId: created.id,
      customerId,
      changeType: 'created',
      newValue: dto.platformUid,
      capturedBy: context.userId,
    });

    await this.platformIdentityRepository.insertChangeLog(context.tenantSchema, {
      action: 'create',
      objectId: created.id,
      objectName: buildPlatformIdentityObjectName(platform.code, dto.platformUid),
      diff: buildPlatformIdentityCreateChangeLogDiff(platform.code, dto),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    return buildPlatformIdentityCreateResult(created, platform);
  }

  async update(
    customerId: string,
    identityId: string,
    talentId: string,
    dto: UpdatePlatformIdentityDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const identity = await this.platformIdentityRepository.findOwnedIdentity(
      context.tenantSchema,
      customerId,
      identityId,
    );

    if (!identity) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform identity not found',
      });
    }

    const changes = collectPlatformIdentityChanges(identity, dto);
    const updated = await this.platformIdentityRepository.update(
      context.tenantSchema,
      identityId,
      buildPlatformIdentityUpdateInput(identity, dto),
    );

    for (const change of changes) {
      await this.platformIdentityRepository.insertHistory(context.tenantSchema, {
        identityId,
        customerId,
        changeType: change.type,
        oldValue: change.oldValue,
        newValue: change.newValue,
        capturedBy: context.userId,
      });
    }

    await this.platformIdentityRepository.insertChangeLog(context.tenantSchema, {
      action: 'update',
      objectId: identityId,
      objectName: buildPlatformIdentityObjectName(
        identity.platformCode,
        updated.platformUid,
      ),
      diff: buildPlatformIdentityUpdateChangeLogDiff(identity, updated),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    return buildPlatformIdentityUpdateResult(updated);
  }

  async getHistory(
    customerId: string,
    talentId: string,
    query: PlatformIdentityHistoryQueryDto,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const pagination = this.databaseService.buildPagination(page, pageSize);
    const [items, total] = await Promise.all([
      this.platformIdentityRepository.findHistory(context.tenantSchema, {
        customerId,
        platformCode: query.platformCode,
        changeType: query.changeType,
        take: pagination.take,
        skip: pagination.skip,
      }),
      this.platformIdentityRepository.countHistory(context.tenantSchema, {
        customerId,
        platformCode: query.platformCode,
        changeType: query.changeType,
      }),
    ]);

    return {
      items: items.map((item) => mapPlatformIdentityHistoryRecord(item)),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
      },
    };
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
