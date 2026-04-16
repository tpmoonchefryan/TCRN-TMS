// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
  buildProfileStoreCreatePayload,
  buildProfileStoreCreateResponse,
  buildProfileStoreDetailResponse,
  buildProfileStoreListItem,
  buildProfileStoreUpdateAudit,
  buildProfileStoreUpdateChanges,
  buildProfileStoreUpdateResponse,
} from '../domain/profile-store.policy';
import type {
  CreateProfileStoreDto,
  PaginationQueryDto,
  UpdateProfileStoreDto,
} from '../dto/pii-config.dto';
import { ProfileStoreRepository } from '../infrastructure/profile-store.repository';

@Injectable()
export class ProfileStoreApplicationService {
  constructor(
    private readonly profileStoreRepository: ProfileStoreRepository,
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  async findMany(query: PaginationQueryDto, context: RequestContext) {
    const schema = context.tenantSchema;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const includeInactive = query.includeInactive ?? false;
    const offset = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.profileStoreRepository.findMany(
        schema,
        includeInactive,
        pageSize,
        offset,
      ),
      this.profileStoreRepository.countMany(schema, includeInactive),
    ]);

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const [talentCount, customerCount] = await Promise.all([
          this.profileStoreRepository.countTalentByStoreId(schema, item.id),
          this.profileStoreRepository.countCustomerByStoreId(schema, item.id),
        ]);

        return buildProfileStoreListItem(item, talentCount, customerCount);
      }),
    );

    return {
      items: enrichedItems,
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(
          total,
          page,
          pageSize,
        ),
      },
    };
  }

  async findById(id: string, context: RequestContext) {
    const schema = context.tenantSchema;
    const store = await this.profileStoreRepository.findById(schema, id);

    if (!store) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Profile store not found',
      });
    }

    const [talentCount, customerCount] = await Promise.all([
      this.profileStoreRepository.countTalentByStoreId(schema, id),
      this.profileStoreRepository.countCustomerByStoreId(schema, id),
    ]);

    return buildProfileStoreDetailResponse(store, talentCount, customerCount);
  }

  async create(dto: CreateProfileStoreDto, context: RequestContext) {
    const schema = context.tenantSchema;
    const existing = await this.profileStoreRepository.findByCode(
      schema,
      dto.code,
    );

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Profile store with this code already exists',
      });
    }

    if (dto.isDefault) {
      await this.profileStoreRepository.unsetDefaultStores(schema);
    }

    const created = await this.profileStoreRepository.create(
      schema,
      buildProfileStoreCreatePayload(dto),
      context.userId ?? '',
    );

    await this.changeLogService.createDirect(
      {
        action: 'create',
        objectType: 'profile_store',
        objectId: created.id,
        objectName: dto.code,
        newValue: {
          code: dto.code,
          nameEn: dto.nameEn,
          isDefault: dto.isDefault,
        },
      },
      context,
    );

    return buildProfileStoreCreateResponse(created);
  }

  async update(
    id: string,
    dto: UpdateProfileStoreDto,
    context: RequestContext,
  ) {
    const schema = context.tenantSchema;
    const existing = await this.profileStoreRepository.findForUpdate(schema, id);

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Profile store not found',
      });
    }

    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    if (dto.isActive === false) {
      const customerCount = await this.profileStoreRepository.countCustomerByStoreId(
        schema,
        id,
      );

      if (customerCount > 0) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Cannot deactivate profile store with ${customerCount} customers`,
        });
      }
    }

    if (dto.isDefault === false && existing.isDefault) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Cannot unset default flag. Set another store as default first.',
      });
    }

    if (dto.isDefault === true && !existing.isDefault) {
      await this.profileStoreRepository.unsetDefaultStores(schema);
    }

    const updated = await this.profileStoreRepository.update(
      schema,
      id,
      buildProfileStoreUpdateChanges(dto),
      context.userId ?? '',
    );

    const { oldValue, newValue } = buildProfileStoreUpdateAudit(
      existing,
      updated,
    );

    await this.changeLogService.createDirect(
      {
        action: 'update',
        objectType: 'profile_store',
        objectId: id,
        objectName: updated.code,
        oldValue,
        newValue,
      },
      context,
    );

    return buildProfileStoreUpdateResponse(updated);
  }
}
