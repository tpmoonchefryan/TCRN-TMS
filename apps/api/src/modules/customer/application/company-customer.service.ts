// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext, TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import {
  buildCompanyCustomerAccessLogFieldChanges,
  buildCompanyCustomerChangeLogNewValue,
  buildCompanyCustomerChangeLogOldValue,
  buildCompanyCustomerCreateResult,
  buildCompanyCustomerUpdateResult,
  hasCompanyCustomerInfoUpdates,
  hasCompanyCustomerVersionMismatch,
  hasCompanyPiiPayload,
  toCompanyCustomerInfoUpdateInput,
  toCompanyCustomerProfileUpdateInput,
} from '../domain/company-customer.policy';
import { buildCustomerPiiPortalSessionResult } from '../domain/pii-platform.policy';
import {
  CreateCompanyCustomerDto,
  CustomerAction,
  ProfileType,
  UpdateCompanyCustomerDto,
} from '../dto/customer.dto';
import { CompanyCustomerRepository } from '../infrastructure/company-customer.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';

@Injectable()
export class CompanyCustomerApplicationService {
  constructor(
    private readonly companyCustomerRepository: CompanyCustomerRepository,
    private readonly changeLogService: ChangeLogService,
    private readonly databaseService: DatabaseService,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerPiiPlatformApplicationService: CustomerPiiPlatformApplicationService,
  ) {}

  async create(
    talentId: string,
    dto: CreateCompanyCustomerDto,
    context: RequestContext,
  ) {
    const createPiiPayload = hasCompanyPiiPayload(dto.pii) ? dto.pii : null;

    if (createPiiPayload) {
      await this.customerPiiPlatformApplicationService.assertPlatformEnabled(
        talentId,
        context,
      );
    }

    const archiveTarget =
      await this.customerArchiveAccessService.requireTalentArchiveTarget(
        talentId,
        context,
      );

    try {
      const customer = await this.companyCustomerRepository.withTransaction(async (prisma) => {
        const statusId = dto.statusCode
          ? await this.companyCustomerRepository.findActiveStatusId(
              prisma,
              context.tenantSchema,
              dto.statusCode,
            )
          : null;
        const businessSegmentId = dto.businessSegmentCode
          ? await this.companyCustomerRepository.findActiveBusinessSegmentId(
              prisma,
              context.tenantSchema,
              dto.businessSegmentCode,
            )
          : null;

        const customer = await this.companyCustomerRepository.createCustomerProfile(
          prisma,
          context.tenantSchema,
          {
            talentId,
            profileStoreId: archiveTarget.profileStoreId,
            nickname: dto.nickname,
            primaryLanguage: dto.primaryLanguage ?? null,
            statusId,
            tags: dto.tags ?? [],
            source: dto.source ?? null,
            notes: dto.notes ?? null,
            userId: context.userId,
          },
        );

        await this.companyCustomerRepository.insertCompanyInfo(
          prisma,
          context.tenantSchema,
          {
            customerId: customer.id,
            companyLegalName: dto.companyLegalName,
            companyShortName: dto.companyShortName ?? null,
            registrationNumber: dto.registrationNumber ?? null,
            vatId: dto.vatId ?? null,
            establishmentDate: dto.establishmentDate
              ? new Date(dto.establishmentDate)
              : null,
            businessSegmentId,
            website: dto.website ?? null,
          },
        );

        if (dto.externalId && dto.consumerCode) {
          const consumer = await this.companyCustomerRepository.findActiveConsumer(
            prisma,
            context.tenantSchema,
            dto.consumerCode,
          );

          if (consumer) {
            await this.companyCustomerRepository.insertExternalId(
              prisma,
              context.tenantSchema,
              {
                customerId: customer.id,
                profileStoreId: archiveTarget.profileStoreId,
                consumerId: consumer.id,
                externalId: dto.externalId,
                userId: context.userId,
              },
            );
          }
        }

        await this.changeLogService.create(
          prisma,
          {
            action: 'create',
            objectType: 'customer_profile',
            objectId: customer.id,
            objectName: dto.nickname,
            newValue: {
              profileType: ProfileType.COMPANY,
              nickname: dto.nickname,
              companyLegalName: dto.companyLegalName,
              companyShortName: dto.companyShortName,
              statusId,
              tags: dto.tags,
              source: dto.source,
            },
          },
          context,
        );

        await this.companyCustomerRepository.insertAccessLog(
          prisma,
          context.tenantSchema,
          {
            customerId: customer.id,
            profileStoreId: archiveTarget.profileStoreId,
            talentId,
            action: CustomerAction.CREATE,
            userId: context.userId,
            userName: context.userName,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            requestId: context.requestId,
          },
        );

        return customer;
      });

      if (createPiiPayload) {
        await this.customerPiiPlatformApplicationService.upsertCustomerPii(
          customer.id,
          talentId,
          ProfileType.COMPANY,
          createPiiPayload,
          context,
        );

        await this.techEventLogService.piiAccess(
          TechEventType.PII_ACCESS_REQUESTED,
          'PII data synchronized to TCRN PII Platform for new company customer',
          {
            customerId: customer.id,
            operatorId: context.userId,
          },
          context,
        );
      }

      return buildCompanyCustomerCreateResult(customer, dto);
    } catch (error) {
      if (createPiiPayload) {
        await this.techEventLogService.warn(
          'PII_PLATFORM_SYNC_FAILED',
          'Failed to synchronize company customer PII to TCRN PII Platform after customer creation',
          {
            talentId,
            operatorId: context.userId,
            originalError: error instanceof Error ? error.message : String(error),
          },
          context,
        );
      }

      throw error;
    }
  }

  async update(
    customerId: string,
    talentId: string,
    dto: UpdateCompanyCustomerDto,
    context: RequestContext,
  ) {
    const updatePiiPayload = hasCompanyPiiPayload(dto.pii) ? dto.pii : null;

    if (updatePiiPayload) {
      await this.customerPiiPlatformApplicationService.assertPlatformEnabled(
        talentId,
        context,
      );
    }

    const prisma = this.databaseService.getPrisma();
    const customer = await this.verifyAccess(customerId, talentId, context);

    if (hasCompanyCustomerVersionMismatch(customer, dto.version)) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    const statusId = dto.statusCode !== undefined && dto.statusCode
      ? await this.companyCustomerRepository.findActiveStatusId(
          prisma,
          context.tenantSchema,
          dto.statusCode,
        )
      : null;
    const businessSegmentId = dto.businessSegmentCode !== undefined && dto.businessSegmentCode
      ? await this.companyCustomerRepository.findActiveBusinessSegmentId(
          prisma,
          context.tenantSchema,
          dto.businessSegmentCode,
        )
      : null;

    const updated = await this.companyCustomerRepository.updateCustomerProfile(
      prisma,
      context.tenantSchema,
      {
        customerId,
        talentId,
        userId: context.userId,
        update: toCompanyCustomerProfileUpdateInput(dto, statusId),
      },
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found or update failed',
      });
    }

    const companyInfoUpdate = toCompanyCustomerInfoUpdateInput(dto, businessSegmentId);
    if (hasCompanyCustomerInfoUpdates(companyInfoUpdate)) {
      const affectedRows = await this.companyCustomerRepository.updateCompanyInfo(
        prisma,
        context.tenantSchema,
        customerId,
        companyInfoUpdate,
      );

      if (affectedRows === 0) {
        await this.companyCustomerRepository.insertCompanyInfoForUpdate(
          prisma,
          context.tenantSchema,
          customerId,
          companyInfoUpdate,
        );
      }
    }

    await this.changeLogService.createDirect(
      {
        action: 'update',
        objectType: 'customer_profile',
        objectId: customerId,
        objectName: updated.nickname,
        oldValue: buildCompanyCustomerChangeLogOldValue(customer),
        newValue: buildCompanyCustomerChangeLogNewValue(updated.nickname, dto),
      },
      context,
    );

    await this.companyCustomerRepository.insertAccessLog(
      prisma,
      context.tenantSchema,
      {
        customerId,
        profileStoreId: customer.profileStoreId,
        talentId,
        action: CustomerAction.UPDATE,
        fieldChanges: buildCompanyCustomerAccessLogFieldChanges(dto),
        userId: context.userId,
        userName: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    );

    if (updatePiiPayload) {
      await this.customerPiiPlatformApplicationService.upsertCustomerPii(
        customerId,
        talentId,
        ProfileType.COMPANY,
        updatePiiPayload,
        context,
      );

      await this.techEventLogService.piiAccess(
        TechEventType.PII_ACCESS_REQUESTED,
        'PII data synchronized to TCRN PII Platform for company customer',
        {
          customerId,
          operatorId: context.userId,
        },
        context,
      );
    }

    return buildCompanyCustomerUpdateResult(updated);
  }

  async createPiiPortalSession(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const customer = await this.verifyAccess(customerId, talentId, context);
    const portalSession =
      await this.customerPiiPlatformApplicationService.createPortalSession(
        customerId,
        talentId,
        ProfileType.COMPANY,
        context,
      );

    await this.techEventLogService.piiAccess(
      TechEventType.PII_ACCESS_REQUESTED,
      'PII portal session created for company customer',
      {
        customerId,
        operatorId: context.userId,
        operatorUsername: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      context,
    );

    await this.companyCustomerRepository.insertAccessLog(
      prisma,
      context.tenantSchema,
      {
        customerId,
        profileStoreId: customer.profileStoreId,
        talentId,
        action: CustomerAction.PII_VIEW,
        userId: context.userId,
        userName: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    );

    return buildCustomerPiiPortalSessionResult(portalSession);
  }

  private async verifyAccess(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerArchiveAccessService.requireCustomerArchiveAccess(
      customerId,
      talentId,
      context,
      {
        expectedProfileType: ProfileType.COMPANY,
      },
    );
  }
}
