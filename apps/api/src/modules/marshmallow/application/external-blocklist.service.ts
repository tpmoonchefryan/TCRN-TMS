// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { buildManagedNameTranslationPayload } from '../../../platform/persistence/managed-name-translations';
import {
  assertValidExternalBlocklistPattern,
  type ExternalBlocklistItemWithMeta,
  getExternalBlocklistScope,
  mapExternalBlocklistItemWithMeta,
  normalizeExternalBlocklistItem,
} from '../domain/external-blocklist.policy';
import type {
  CreateExternalBlocklistDto,
  DisableExternalBlocklistDto,
  ExternalBlocklistItem,
  ExternalBlocklistQueryDto,
  OwnerType,
  UpdateExternalBlocklistDto,
} from '../dto/external-blocklist.dto';
import { ExternalBlocklistRepository } from '../infrastructure/external-blocklist.repository';
import { ExternalBlocklistCacheRepository } from '../infrastructure/external-blocklist-cache.repository';

@Injectable()
export class ExternalBlocklistApplicationService {
  constructor(
    private readonly externalBlocklistRepository: ExternalBlocklistRepository,
    private readonly externalBlocklistCacheRepository: ExternalBlocklistCacheRepository,
  ) {}

  async findMany(
    tenantSchema: string,
    query: ExternalBlocklistQueryDto,
  ): Promise<{ items: ExternalBlocklistItemWithMeta[]; total: number }> {
    const scopeType = (query.scopeType ?? 'tenant') as OwnerType;
    const scopeId = query.scopeId ?? null;
    const includeInherited = query.includeInherited ?? true;
    const includeDisabled = query.includeDisabled ?? false;
    const includeInactive = query.includeInactive ?? false;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const scopeChain = await this.externalBlocklistRepository.getScopeChain(
      tenantSchema,
      scopeType,
      scopeId,
    );
    const effectiveScopes = includeInherited
      ? scopeChain
      : [getExternalBlocklistScope(scopeType, scopeId)];

    const total = await this.externalBlocklistRepository.countMany(
      tenantSchema,
      effectiveScopes,
      {
        category: query.category,
        includeInactive,
      },
    );
    const items = await this.externalBlocklistRepository.findMany(
      tenantSchema,
      effectiveScopes,
      {
        category: query.category,
        includeInactive,
        page,
        pageSize,
      },
    );
    const disabledIds = await this.externalBlocklistRepository.getDisabledIds(
      tenantSchema,
      scopeType,
      scopeId,
    );

    const enrichedItems = items
      .filter((item) => includeDisabled || !disabledIds.has(item.id))
      .map((item) => mapExternalBlocklistItemWithMeta(item, scopeType, scopeId, disabledIds));

    return {
      items: enrichedItems,
      total: includeDisabled ? total : enrichedItems.length,
    };
  }

  async findWithInheritance(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<ExternalBlocklistItemWithMeta[]> {
    const resolvedScopeId = scopeId ?? null;
    const scopeChain = await this.externalBlocklistRepository.getScopeChain(
      tenantSchema,
      scopeType,
      resolvedScopeId,
    );
    const items = await this.externalBlocklistRepository.findWithInheritance(
      tenantSchema,
      scopeChain,
      getExternalBlocklistScope(scopeType, resolvedScopeId),
    );
    const disabledIds = await this.externalBlocklistRepository.getDisabledIds(
      tenantSchema,
      scopeType,
      resolvedScopeId,
    );

    return items
      .filter((item) => !disabledIds.has(item.id))
      .map((item) => mapExternalBlocklistItemWithMeta(item, scopeType, resolvedScopeId, disabledIds));
  }

  async findById(
    tenantSchema: string,
    id: string,
  ): Promise<ExternalBlocklistItem | null> {
    const item = await this.externalBlocklistRepository.findById(tenantSchema, id);
    return item ? normalizeExternalBlocklistItem(item) : null;
  }

  async create(
    tenantSchema: string,
    dto: CreateExternalBlocklistDto,
    context: RequestContext,
  ): Promise<ExternalBlocklistItem> {
    this.ensureValidPattern(dto.patternType, dto.pattern);
    const translationPayload = buildManagedNameTranslationPayload(dto);

    const item = await this.externalBlocklistRepository.create(
      tenantSchema,
      {
        ...dto,
        extraData: translationPayload.extraData,
        nameEn: translationPayload.nameEn,
        nameJa: translationPayload.nameJa,
        nameZh: translationPayload.nameZh,
      },
      context.userId ?? null,
    );

    await this.externalBlocklistCacheRepository.clearForOwner(
      dto.ownerType,
      dto.ownerId ?? null,
    );

    return normalizeExternalBlocklistItem(item);
  }

  async update(
    tenantSchema: string,
    id: string,
    dto: UpdateExternalBlocklistDto,
    context: RequestContext,
  ): Promise<ExternalBlocklistItem> {
    const existing = await this.externalBlocklistRepository.findById(tenantSchema, id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Version conflict. Please refresh and try again.',
      });
    }

    if (dto.pattern !== undefined || dto.patternType !== undefined) {
      this.ensureValidPattern(
        dto.patternType ?? existing.patternType,
        dto.pattern ?? existing.pattern,
      );
    }
    const translationPayload = buildManagedNameTranslationPayload(dto, existing);

    const item = await this.externalBlocklistRepository.update(
      tenantSchema,
      id,
      {
        ...dto,
        extraData: translationPayload.extraData,
        nameEn: translationPayload.nameEn,
        nameJa: translationPayload.nameJa,
        nameZh: translationPayload.nameZh,
      },
      context.userId ?? null,
    );

    if (!item) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Update failed. Version conflict.',
      });
    }

    await this.externalBlocklistCacheRepository.clearForOwner(
      existing.ownerType as OwnerType,
      existing.ownerId,
    );

    return normalizeExternalBlocklistItem(item);
  }

  async delete(tenantSchema: string, id: string): Promise<void> {
    const existing = await this.externalBlocklistRepository.findById(tenantSchema, id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    await this.externalBlocklistRepository.delete(tenantSchema, id);
    await this.externalBlocklistCacheRepository.clearForOwner(
      existing.ownerType as OwnerType,
      existing.ownerId,
    );
  }

  async batchToggle(
    tenantSchema: string,
    ids: string[],
    isActive: boolean,
    context: RequestContext,
  ): Promise<{ updated: number }> {
    const updated = await this.externalBlocklistRepository.batchToggle(
      tenantSchema,
      ids,
      isActive,
      context.userId ?? null,
    );

    await this.externalBlocklistCacheRepository.clearAll();

    return { updated };
  }

  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto,
    userId: string,
  ): Promise<{ id: string; disabled: boolean }> {
    const scopeId = dto.scopeId ?? null;
    const entry = await this.externalBlocklistRepository.findDisableCandidate(tenantSchema, id);

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    if (entry.ownerType === dto.scopeType && entry.ownerId === scopeId) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited patterns',
      });
    }

    if (entry.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This pattern is set to force use and cannot be disabled',
      });
    }

    await this.externalBlocklistRepository.disableInScope(
      tenantSchema,
      id,
      dto.scopeType,
      scopeId,
      userId,
    );
    await this.externalBlocklistCacheRepository.clearForOwner(dto.scopeType, scopeId);

    return { id, disabled: true };
  }

  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto,
  ): Promise<{ id: string; enabled: boolean }> {
    const scopeId = dto.scopeId ?? null;

    await this.externalBlocklistRepository.enableInScope(
      tenantSchema,
      id,
      dto.scopeType,
      scopeId,
    );
    await this.externalBlocklistCacheRepository.clearForOwner(dto.scopeType, scopeId);

    return { id, enabled: true };
  }

  private ensureValidPattern(patternType: string, pattern: string): void {
    try {
      assertValidExternalBlocklistPattern(patternType, pattern);
    } catch {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid regex pattern',
      });
    }
  }
}
