// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { TalentCustomDomainService } from '../../talent';
import { MarshmallowConfigApplicationService } from '../application/marshmallow-config.service';
import type { UpdateConfigDto } from '../dto/marshmallow.dto';

@Injectable()
export class MarshmallowConfigService {
  constructor(
    private readonly marshmallowConfigApplicationService: MarshmallowConfigApplicationService,
    private readonly talentCustomDomainService: TalentCustomDomainService,
  ) {}

  /**
   * Get or create config for talent (multi-tenant aware)
   */
  getOrCreate(talentId: string, tenantSchema: string) {
    return this.marshmallowConfigApplicationService.getOrCreate(talentId, tenantSchema);
  }

  /**
   * Update config (multi-tenant aware)
   */
  update(
    talentId: string,
    tenantSchema: string,
    dto: UpdateConfigDto,
    context: RequestContext,
  ) {
    return this.marshmallowConfigApplicationService.update(
      talentId,
      tenantSchema,
      dto,
      context,
    );
  }

  /**
   * Set custom domain for marshmallow config
   */
  async setCustomDomain(
    talentId: string,
    customDomain: string | null,
    context: RequestContext,
  ): Promise<{ customDomain: string | null; token: string | null; txtRecord: string | null }> {
    const tenantSchema = this.getTenantSchema(context);

    await this.getOrCreate(talentId, tenantSchema);

    try {
      return await this.talentCustomDomainService.setCustomDomain(
        talentId,
        tenantSchema,
        customDomain,
      );
    } catch (error) {
      if (this.isAlreadyExistsError(error)) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: 'Domain already in use',
        });
      }

      throw error;
    }
  }

  /**
   * Verify custom domain by checking DNS TXT record
   */
  async verifyCustomDomain(
    talentId: string,
    context: RequestContext,
  ): Promise<{ verified: boolean; message: string }> {
    const tenantSchema = this.getTenantSchema(context);

    const config = await this.marshmallowConfigApplicationService.findExistingConfig(
      talentId,
      tenantSchema,
    );

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow config not found',
      });
    }

    return this.talentCustomDomainService.verifyCustomDomain(
      talentId,
      tenantSchema,
    );
  }

  private getTenantSchema(context: RequestContext): string {
    if (!context.tenantSchema) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant schema is required',
      });
    }

    return context.tenantSchema;
  }

  private isAlreadyExistsError(error: unknown): boolean {
    if (!(error instanceof BadRequestException)) {
      return false;
    }

    const response = error.getResponse();
    if (typeof response === 'string') {
      return false;
    }

    if (!('code' in response)) {
      return false;
    }

    return response.code === ErrorCodes.RES_ALREADY_EXISTS;
  }
}
