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
  buildBlocklistCreateLogPayload,
  buildBlocklistUpdateData,
  isCurrentScopeOwner,
  isValidBlocklistRegexPattern,
} from '../domain/blocklist-write.policy';
import type {
  CreateBlocklistDto,
  DisableScopeDto,
  TestBlocklistDto,
  UpdateBlocklistDto,
} from '../dto/security.dto';
import { BlocklistWriteRepository } from '../infrastructure/blocklist-write.repository';
import { BlocklistMatcherService } from '../services/blocklist-matcher.service';
import { BlocklistReadService } from './blocklist-read.service';

@Injectable()
export class BlocklistWriteService {
  constructor(
    private readonly blocklistWriteRepository: BlocklistWriteRepository,
    private readonly blocklistReadService: BlocklistReadService,
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly matcherService: BlocklistMatcherService,
  ) {}

  async create(dto: CreateBlocklistDto, context: RequestContext) {
    if (
      dto.patternType === 'regex' &&
      !isValidBlocklistRegexPattern(dto.pattern)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid regex pattern',
      });
    }

    const tenantSchema = context.tenantSchema;
    const prisma = this.databaseService.getPrisma();
    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await this.blocklistWriteRepository.create(
        tx,
        tenantSchema,
        dto,
        context.userId as string,
      );

      await this.changeLogService.create(
        tx,
        {
          action: 'create',
          objectType: 'blocklist_entry',
          objectId: newEntry.id,
          objectName: dto.nameEn,
          newValue: buildBlocklistCreateLogPayload(dto),
        },
        context,
      );

      return newEntry;
    });

    await this.matcherService.rebuildMatcher();
    return this.blocklistReadService.findById(tenantSchema, entry.id);
  }

  async update(
    id: string,
    dto: UpdateBlocklistDto,
    context: RequestContext,
  ) {
    const tenantSchema = context.tenantSchema;
    const entry = await this.blocklistWriteRepository.findForWrite(
      tenantSchema,
      id,
    );

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    if (entry.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Entry was modified by another user',
      });
    }

    if (
      dto.patternType === 'regex' &&
      dto.pattern &&
      !isValidBlocklistRegexPattern(dto.pattern)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid regex pattern',
      });
    }

    const prisma = this.databaseService.getPrisma();
    await prisma.$transaction(async (tx) => {
      await this.blocklistWriteRepository.update(
        tx,
        tenantSchema,
        id,
        buildBlocklistUpdateData(dto),
        context.userId,
      );

      await this.changeLogService.create(
        tx,
        {
          action: 'update',
          objectType: 'blocklist_entry',
          objectId: id,
          objectName: entry.nameEn,
        },
        context,
      );
    });

    await this.matcherService.rebuildMatcher();
    return this.blocklistReadService.findById(tenantSchema, id);
  }

  async delete(id: string, context: RequestContext) {
    const tenantSchema = context.tenantSchema;
    const entry = await this.blocklistWriteRepository.findForWrite(
      tenantSchema,
      id,
    );

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    const prisma = this.databaseService.getPrisma();
    await prisma.$transaction(async (tx) => {
      await this.blocklistWriteRepository.deactivate(
        tx,
        tenantSchema,
        id,
        context.userId,
      );

      await this.changeLogService.create(
        tx,
        {
          action: 'delete',
          objectType: 'blocklist_entry',
          objectId: id,
          objectName: entry.nameEn,
        },
        context,
      );
    });

    await this.matcherService.rebuildMatcher();
    return { id, deleted: true };
  }

  test(dto: TestBlocklistDto) {
    return this.matcherService.testPattern(
      dto.testContent,
      dto.pattern,
      dto.patternType,
    );
  }

  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto,
    userId: string,
  ): Promise<{ id: string; disabled: boolean }> {
    const entry = await this.blocklistWriteRepository.findScopeEntryById(
      tenantSchema,
      id,
    );

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    if (isCurrentScopeOwner(entry, dto)) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited blocklist entries',
      });
    }

    if (entry.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This blocklist entry is set to force use and cannot be disabled',
      });
    }

    await this.blocklistWriteRepository.disableInScope(
      tenantSchema,
      id,
      dto.scopeType,
      dto.scopeId,
      userId,
    );

    return { id, disabled: true };
  }

  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto,
  ): Promise<{ id: string; enabled: boolean }> {
    await this.blocklistWriteRepository.enableInScope(
      tenantSchema,
      id,
      dto.scopeType,
      dto.scopeId,
    );

    return { id, enabled: true };
  }
}
