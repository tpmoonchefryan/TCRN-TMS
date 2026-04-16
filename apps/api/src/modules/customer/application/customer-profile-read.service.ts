// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  mapCustomerProfileDetailItem,
  mapCustomerProfileListItem,
} from '../domain/customer-profile-read.policy';
import type { CustomerListQueryDto } from '../dto/customer.dto';
import { CustomerProfileReadRepository } from '../infrastructure/customer-profile-read.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';

@Injectable()
export class CustomerProfileReadService {
  constructor(
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerProfileReadRepository: CustomerProfileReadRepository,
  ) {}

  async findMany(
    talentId: string,
    query: CustomerListQueryDto,
    context: RequestContext,
  ) {
    const archiveTarget =
      await this.customerArchiveAccessService.requireTalentArchiveTarget(
        talentId,
        context,
      );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.customerProfileReadRepository.findMany(
        context.tenantSchema,
        {
          profileStoreId: archiveTarget.profileStoreId,
          profileType: query.profileType,
          statusId: query.statusId,
          isActive: query.isActive,
          search: query.search,
          tags: query.tags,
          createdFrom: query.createdFrom,
          createdTo: query.createdTo,
          sort: query.sort ?? 'createdAt',
          order: query.order ?? 'desc',
        },
        { page, pageSize },
      ),
      this.customerProfileReadRepository.countMany(context.tenantSchema, {
        profileStoreId: archiveTarget.profileStoreId,
        profileType: query.profileType,
        statusId: query.statusId,
        isActive: query.isActive,
        search: query.search,
        tags: query.tags,
        createdFrom: query.createdFrom,
        createdTo: query.createdTo,
      }),
    ]);

    const membershipMap = await this.customerProfileReadRepository.findActiveMembershipSummaries(
      context.tenantSchema,
      items.map((item) => item.id),
    );

    let filteredItems = items;
    if (typeof query.hasMembership !== 'undefined') {
      filteredItems = items.filter((item) => {
        const hasActiveMembership = membershipMap.has(item.id);
        return query.hasMembership ? hasActiveMembership : !hasActiveMembership;
      });
    }

    return {
      items: filteredItems.map((item) =>
        mapCustomerProfileListItem(item, membershipMap.get(item.id) ?? null),
      ),
      meta: {
        pagination: {
          page,
          pageSize,
          totalCount: total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  async findById(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const customerAccess =
      await this.customerArchiveAccessService.requireCustomerArchiveAccess(
        customerId,
        talentId,
        context,
      );

    const customer = await this.customerProfileReadRepository.findById(
      context.tenantSchema,
      customerId,
      customerAccess.profileStoreId,
    );

    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    const [
      talentData,
      profileStoreData,
      originTalentData,
      lastModifiedTalentData,
      statusData,
      inactivationReasonData,
      companyInfoData,
      highestMembership,
      platformIdentityCount,
      membershipRecordCount,
      accessLogs,
    ] = await Promise.all([
      this.customerProfileReadRepository.findTalentSummary(
        context.tenantSchema,
        customer.talentId,
      ),
      this.customerProfileReadRepository.findProfileStoreSummary(
        context.tenantSchema,
        customer.profileStoreId,
      ),
      this.customerProfileReadRepository.findTalentSummary(
        context.tenantSchema,
        customer.originTalentId,
      ),
      customer.lastModifiedTalentId
        ? this.customerProfileReadRepository.findTalentSummary(
            context.tenantSchema,
            customer.lastModifiedTalentId,
          )
        : Promise.resolve(null),
      customer.statusId
        ? this.customerProfileReadRepository.findStatusSummary(
            context.tenantSchema,
            customer.statusId,
          )
        : Promise.resolve(null),
      customer.inactivationReasonId
        ? this.customerProfileReadRepository.findInactivationReasonSummary(
            context.tenantSchema,
            customer.inactivationReasonId,
          )
        : Promise.resolve(null),
      customer.profileType === 'company'
        ? this.customerProfileReadRepository.findCompanyInfo(
            context.tenantSchema,
            customer.id,
          )
        : Promise.resolve(null),
      this.customerProfileReadRepository.findHighestActiveMembership(
        context.tenantSchema,
        customer.id,
      ),
      this.customerProfileReadRepository.countPlatformIdentities(
        context.tenantSchema,
        customer.id,
      ),
      this.customerProfileReadRepository.countMembershipRecords(
        context.tenantSchema,
        customer.id,
      ),
      this.customerProfileReadRepository.findRecentAccessLogs(
        context.tenantSchema,
        customer.id,
      ),
    ]);

    return mapCustomerProfileDetailItem({
      id: customer.id,
      talentId: customer.talentId,
      profileStoreId: customer.profileStoreId,
      originTalentId: customer.originTalentId,
      lastModifiedTalentId: customer.lastModifiedTalentId,
      profileType: customer.profileType,
      nickname: customer.nickname,
      primaryLanguage: customer.primaryLanguage,
      notes: customer.notes,
      tags: customer.tags,
      source: customer.source,
      isActive: customer.isActive,
      inactivatedAt: customer.inactivatedAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      createdBy: customer.createdBy,
      updatedBy: customer.updatedBy,
      version: customer.version,
      talent: talentData
        ? {
            id: talentData.id,
            code: talentData.code,
            displayName: talentData.displayName,
          }
        : { id: customer.talentId, code: '', displayName: '' },
      profileStore: profileStoreData
        ? {
            id: profileStoreData.id,
            code: profileStoreData.code,
            nameEn: profileStoreData.nameEn,
          }
        : { id: customer.profileStoreId, code: '', nameEn: '' },
      originTalent: originTalentData
        ? {
            id: originTalentData.id,
            code: originTalentData.code,
            displayName: originTalentData.displayName,
          }
        : { id: customer.originTalentId, code: '', displayName: '' },
      lastModifiedTalent: lastModifiedTalentData
        ? {
            id: lastModifiedTalentData.id,
            code: lastModifiedTalentData.code,
            displayName: lastModifiedTalentData.displayName,
          }
        : null,
      status: statusData
        ? {
            id: statusData.id,
            code: statusData.code,
            nameEn: statusData.nameEn,
            color: statusData.color,
          }
        : null,
      inactivationReason: inactivationReasonData
        ? {
            id: inactivationReasonData.id,
            code: inactivationReasonData.code,
            nameEn: inactivationReasonData.nameEn,
          }
        : null,
      companyInfo: companyInfoData
        ? {
            companyLegalName: companyInfoData.companyLegalName,
            companyShortName: companyInfoData.companyShortName,
            registrationNumber: companyInfoData.registrationNumber,
            vatId: companyInfoData.vatId,
            establishmentDate: companyInfoData.establishmentDate,
            website: companyInfoData.website,
            businessSegment: companyInfoData.businessSegment,
          }
        : null,
      membershipRecords: highestMembership
        ? [
            {
              platform: {
                code: highestMembership.platformCode,
                displayName: highestMembership.platformName,
              },
              membershipLevel: {
                code: highestMembership.levelCode,
                nameEn: highestMembership.levelName,
                color: highestMembership.color,
              },
            },
          ]
        : [],
      _count: {
        platformIdentities: platformIdentityCount,
        membershipRecords: membershipRecordCount,
      },
      accessLogs: accessLogs.map((log) => ({
        action: log.action,
        occurredAt: log.occurredAt,
        talent: {
          id: log.talentId,
          displayName: log.talentDisplayName,
        },
        operator: log.operatorId
          ? {
              id: log.operatorId,
              username: log.operatorUsername ?? '',
            }
          : null,
      })),
    });
  }
}
