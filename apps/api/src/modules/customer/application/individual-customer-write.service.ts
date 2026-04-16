// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable } from '@nestjs/common';
import { ErrorCodes, type RequestContext, TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import {
  buildIndividualCustomerCreateChangeLogNewValue,
  buildIndividualCustomerCreateResult,
  buildIndividualCustomerUpdateChangeLogNewValue,
  buildIndividualCustomerUpdateChangeLogOldValue,
  buildIndividualCustomerUpdateResult,
  hasIndividualCustomerVersionMismatch,
  toIndividualCustomerUpdateInput,
} from '../domain/individual-customer-write.policy';
import {
  CreateIndividualCustomerDto,
  CustomerAction,
  ProfileType,
  type UpdateIndividualCustomerDto,
} from '../dto/customer.dto';
import { IndividualCustomerPiiRepository } from '../infrastructure/individual-customer-pii.repository';
import { IndividualCustomerWriteRepository } from '../infrastructure/individual-customer-write.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';

@Injectable()
export class IndividualCustomerWriteApplicationService {
  constructor(
    private readonly individualCustomerWriteRepository: IndividualCustomerWriteRepository,
    private readonly individualCustomerPiiRepository: IndividualCustomerPiiRepository,
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerPiiPlatformApplicationService: CustomerPiiPlatformApplicationService,
  ) {}

  async create(
    talentId: string,
    dto: CreateIndividualCustomerDto,
    context: RequestContext,
  ) {
    if (dto.pii) {
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

    const statusId = dto.statusCode
      ? await this.individualCustomerWriteRepository.findActiveStatusId(
          this.databaseService.getPrisma(),
          context.tenantSchema,
          dto.statusCode,
        )
      : null;

    try {
      const customer = await this.individualCustomerWriteRepository.withTransaction(
        async (prisma) => {
          const created = await this.individualCustomerWriteRepository.createCustomerProfile(
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

          if (dto.externalId && dto.consumerCode) {
            const consumer = await this.individualCustomerWriteRepository.findActiveConsumer(
              prisma,
              context.tenantSchema,
              dto.consumerCode,
            );

            if (consumer) {
              await this.individualCustomerWriteRepository.insertExternalId(
                prisma,
                context.tenantSchema,
                {
                  customerId: created.id,
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
              objectId: created.id,
              objectName: dto.nickname,
              newValue: buildIndividualCustomerCreateChangeLogNewValue(dto, statusId),
            },
            context,
          );

          await this.individualCustomerWriteRepository.insertAccessLog(
            prisma,
              context.tenantSchema,
              {
                customerId: created.id,
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

          return created;
        },
      );

      if (dto.pii) {
        await this.customerPiiPlatformApplicationService.upsertCustomerPii(
          customer.id,
          talentId,
          ProfileType.INDIVIDUAL,
          dto.pii,
          context,
        );

        await this.techEventLogService.piiAccess(
          TechEventType.PII_ACCESS_REQUESTED,
          'PII data synchronized to TCRN PII Platform for new individual customer',
          {
            customerId: customer.id,
            operatorId: context.userId,
          },
          context,
        );
      }

      return buildIndividualCustomerCreateResult(customer);
    } catch (error) {
      if (dto.pii) {
        await this.techEventLogService.warn(
          'PII_PLATFORM_SYNC_FAILED',
          'Failed to synchronize customer PII to TCRN PII Platform after customer creation',
          {
            talentId,
            profileStoreId: archiveTarget.profileStoreId,
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
    dto: UpdateIndividualCustomerDto,
    context: RequestContext,
  ) {
    const customer = await this.verifyAccess(customerId, talentId, context);

    if (hasIndividualCustomerVersionMismatch(customer, dto.version)) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    let statusId: string | undefined;
    if (dto.statusCode !== undefined && dto.statusCode) {
      statusId = await this.individualCustomerWriteRepository.findActiveStatusId(
        this.databaseService.getPrisma(),
        context.tenantSchema,
        dto.statusCode,
      ) ?? undefined;
    }

    const updated = await this.individualCustomerWriteRepository.withTransaction(
      async (prisma) => {
        const result = await this.individualCustomerWriteRepository.updateCustomerProfile(
          prisma,
          context.tenantSchema,
          {
            customerId,
            talentId,
            userId: context.userId,
            update: toIndividualCustomerUpdateInput(dto, statusId),
          },
        );

        await this.changeLogService.create(
          prisma,
          {
            action: 'update',
            objectType: 'customer_profile',
            objectId: customerId,
            objectName: result.nickname,
            oldValue: buildIndividualCustomerUpdateChangeLogOldValue(customer),
            newValue: buildIndividualCustomerUpdateChangeLogNewValue(
              result.nickname,
              customer,
              dto,
              statusId,
            ),
          },
          context,
        );

        await this.individualCustomerWriteRepository.insertAccessLog(
          prisma,
          context.tenantSchema,
          {
            customerId,
            profileStoreId: customer.profileStoreId,
            talentId,
            action: CustomerAction.UPDATE,
            fieldChanges: JSON.stringify(dto),
            userId: context.userId,
            userName: context.userName,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            requestId: context.requestId,
          },
        );

        return result;
      },
    );

    return buildIndividualCustomerUpdateResult(updated);
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
        expectedProfileType: ProfileType.INDIVIDUAL,
      },
    );
  }
}
