// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildEffectiveAdapterLineage,
  buildEffectiveAdapterResolutionResult,
  type EffectiveAdapterResolutionTarget,
  type EffectiveAdapterResolvedConfig,
  type EffectiveAdapterScope,
  selectEffectiveAdapter,
} from '../domain/adapter-resolution.policy';
import { isSecretAdapterConfigKey } from '../domain/adapter-write.policy';
import { OwnerType } from '../dto/integration.dto';
import { AdapterResolutionRepository } from '../infrastructure/adapter-resolution.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { getAdapterTenantSchema } from './adapter-context.util';

@Injectable()
export class AdapterResolutionApplicationService {
  constructor(
    private readonly adapterResolutionRepository: AdapterResolutionRepository,
    private readonly adapterCryptoService: AdapterCryptoService,
  ) {}

  async resolveEffectiveAdapter(
    target: EffectiveAdapterResolutionTarget,
    context: RequestContext,
  ) {
    const tenantSchema = getAdapterTenantSchema(context);
    const normalizedTarget = this.validateTarget(target);
    const lineage = await this.buildLineage(normalizedTarget, tenantSchema);
    const adapters = await this.adapterResolutionRepository.findAdapters(
      tenantSchema,
      lineage,
      normalizedTarget.platformCode,
      normalizedTarget.adapterType,
    );

    if (adapters.length === 0) {
      return null;
    }

    const adapterIds = adapters.map((adapter) => adapter.id);
    const [configs, overrides] = await Promise.all([
      this.adapterResolutionRepository.findConfigs(tenantSchema, adapterIds),
      this.adapterResolutionRepository.findOverrides(tenantSchema, adapterIds, lineage),
    ]);

    const effectiveAdapter = selectEffectiveAdapter({
      target: normalizedTarget,
      lineage,
      adapters,
      overrides,
    });

    if (!effectiveAdapter) {
      return null;
    }

    const resolvedConfigs = configs
      .filter((config) => config.adapterId === effectiveAdapter.id)
      .map((config): EffectiveAdapterResolvedConfig => ({
        id: config.id,
        configKey: config.configKey,
        configValue: this.resolveConfigValue(
          config.configValue,
          config.isSecret || isSecretAdapterConfigKey(config.configKey),
        ),
        isSecret: config.isSecret,
      }));

    return buildEffectiveAdapterResolutionResult(
      effectiveAdapter,
      normalizedTarget,
      resolvedConfigs,
    );
  }

  private validateTarget(
    target: EffectiveAdapterResolutionTarget,
  ): EffectiveAdapterScope & {
    platformCode: string;
    adapterType?: string;
  } {
    if (target.ownerType === OwnerType.TENANT) {
      return {
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformCode: target.platformCode,
        adapterType: target.adapterType,
      };
    }

    if (!target.ownerId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Owner id is required for non-tenant adapter resolution',
      });
    }

    return {
      ownerType: target.ownerType,
      ownerId: target.ownerId,
      platformCode: target.platformCode,
      adapterType: target.adapterType,
    };
  }

  private async buildLineage(
    target: EffectiveAdapterScope,
    tenantSchema: string,
  ): Promise<EffectiveAdapterScope[]> {
    if (target.ownerType === OwnerType.TENANT) {
      return buildEffectiveAdapterLineage(target, null);
    }

    if (target.ownerType === OwnerType.SUBSIDIARY) {
      const subsidiary = await this.adapterResolutionRepository.findSubsidiaryScope(
        tenantSchema,
        target.ownerId as string,
      );

      if (!subsidiary) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }

      return buildEffectiveAdapterLineage(target, null);
    }

    const talent = await this.adapterResolutionRepository.findTalentHierarchy(
      tenantSchema,
      target.ownerId as string,
    );

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return buildEffectiveAdapterLineage(target, talent.subsidiaryId);
  }

  private resolveConfigValue(value: string, isSecret: boolean): string {
    if (!isSecret || !this.adapterCryptoService.isEncrypted(value)) {
      return value;
    }

    return this.adapterCryptoService.decrypt(value);
  }
}
