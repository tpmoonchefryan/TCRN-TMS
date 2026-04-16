// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { PiiClientService } from '../../pii';
import {
  buildPiiServiceConfigCreatePayload,
  buildPiiServiceConfigCreateResponse,
  buildPiiServiceConfigDetailResponse,
  buildPiiServiceConfigListItem,
  buildPiiServiceConfigUpdateAudit,
  buildPiiServiceConfigUpdateChanges,
  buildPiiServiceConfigUpdateResponse,
  buildPiiServiceHealthBaseUrl,
  buildPiiServiceHealthCheckResponse,
} from '../domain/pii-service-config.policy';
import type {
  CreatePiiServiceConfigDto,
  PaginationQueryDto,
  UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';
import { PiiServiceConfigRepository } from '../infrastructure/pii-service-config.repository';

@Injectable()
export class PiiServiceConfigApplicationService {
  constructor(
    private readonly piiServiceConfigRepository: PiiServiceConfigRepository,
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly piiClientService: PiiClientService,
  ) {}

  async findMany(query: PaginationQueryDto, context: RequestContext) {
    const schema = context.tenantSchema;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const includeInactive = query.includeInactive ?? false;

    const [items, total] = await Promise.all([
      this.piiServiceConfigRepository.findMany(
        schema,
        includeInactive,
        pageSize,
        offset,
      ),
      this.piiServiceConfigRepository.countMany(schema, includeInactive),
    ]);

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const profileStoreCount =
          await this.piiServiceConfigRepository.countProfileStoresByConfigId(
            schema,
            item.id,
          );

        return buildPiiServiceConfigListItem(item, profileStoreCount);
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
    const config = await this.piiServiceConfigRepository.findById(schema, id);

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    const profileStoreCount =
      await this.piiServiceConfigRepository.countProfileStoresByConfigId(
        schema,
        id,
      );

    return buildPiiServiceConfigDetailResponse(config, profileStoreCount);
  }

  async create(dto: CreatePiiServiceConfigDto, context: RequestContext) {
    const schema = context.tenantSchema;
    const existing = await this.piiServiceConfigRepository.findByCode(
      schema,
      dto.code,
    );

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'PII service config with this code already exists',
      });
    }

    const payload = buildPiiServiceConfigCreatePayload(dto);
    const created = await this.piiServiceConfigRepository.create(
      schema,
      payload,
      context.userId ?? '',
    );

    await this.changeLogService.createDirect(
      {
        action: 'create',
        objectType: 'pii_service_config',
        objectId: created.id,
        objectName: dto.code,
        newValue: {
          code: dto.code,
          nameEn: dto.nameEn,
          apiUrl: dto.apiUrl,
          authType: dto.authType,
        },
      },
      context,
    );

    return buildPiiServiceConfigCreateResponse(created);
  }

  async update(
    id: string,
    dto: UpdatePiiServiceConfigDto,
    context: RequestContext,
  ) {
    const schema = context.tenantSchema;
    const existing = await this.piiServiceConfigRepository.findForUpdate(
      schema,
      id,
    );

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    const updated = await this.piiServiceConfigRepository.update(
      schema,
      id,
      buildPiiServiceConfigUpdateChanges(dto),
      context.userId ?? '',
    );

    const { newValue, oldValue } = buildPiiServiceConfigUpdateAudit(
      existing,
      updated,
    );

    await this.changeLogService.createDirect(
      {
        action: 'update',
        objectType: 'pii_service_config',
        objectId: id,
        objectName: updated.code,
        oldValue,
        newValue,
      },
      context,
    );

    return buildPiiServiceConfigUpdateResponse(updated);
  }

  async testConnection(id: string, context: RequestContext) {
    const schema = context.tenantSchema;
    const config = await this.piiServiceConfigRepository.findForConnectionTest(
      schema,
      id,
    );

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    const result = await this.piiClientService.checkHealth(
      buildPiiServiceHealthBaseUrl(config),
    );

    await this.piiServiceConfigRepository.updateHealthStatus(
      schema,
      id,
      result.status === 'ok',
    );

    return buildPiiServiceHealthCheckResponse(result);
  }
}
