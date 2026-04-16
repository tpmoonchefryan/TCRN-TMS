// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { OwnerType } from '../../integration/dto/integration.dto';
import { AdapterResolutionService } from '../../integration/services/adapter-resolution.service';
import { PiiClientService } from '../../pii';
import {
  buildCustomerPiiPlatformLifecyclePayload,
  buildCustomerPiiPlatformPortalSessionPayload,
  buildCustomerPiiPlatformWritePayload,
  type CustomerPiiPlatformRuntime,
  PII_PLATFORM_CODE,
  resolveCustomerPiiPlatformRuntime,
} from '../domain/pii-platform.policy';
import type {
  CompanyPiiDataDto,
  PiiDataDto,
  ProfileType,
} from '../dto/customer.dto';

@Injectable()
export class CustomerPiiPlatformApplicationService {
  constructor(
    private readonly adapterResolutionService: AdapterResolutionService,
    private readonly piiClientService: PiiClientService,
  ) {}

  async upsertCustomerPii(
    customerId: string,
    talentId: string,
    profileType: ProfileType,
    pii: PiiDataDto | CompanyPiiDataDto,
    context: RequestContext,
  ) {
    const runtime = await this.resolveRuntime(talentId, context);

    return this.piiClientService.upsertCustomerPii(
      runtime.apiBaseUrl,
      buildCustomerPiiPlatformWritePayload(
        customerId,
        talentId,
        profileType,
        pii,
        context,
        runtime,
      ),
      runtime.serviceToken,
      context.tenantId,
      context.tenantSchema,
    );
  }

  async assertPlatformEnabled(
    talentId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.resolveRuntime(talentId, context);
  }

  async createPortalSession(
    customerId: string,
    talentId: string,
    profileType: ProfileType,
    context: RequestContext,
  ) {
    const runtime = await this.resolveRuntime(talentId, context);

    return this.piiClientService.createPortalSession(
      runtime.apiBaseUrl,
      buildCustomerPiiPlatformPortalSessionPayload(
        customerId,
        talentId,
        profileType,
        context,
        runtime,
      ),
      runtime.serviceToken,
      context.tenantId,
      context.tenantSchema,
    );
  }

  async syncCustomerLifecycleState(
    customerId: string,
    talentId: string,
    profileType: ProfileType,
    lifecycle: {
      action: 'deactivate' | 'reactivate';
      isActive: boolean;
      reasonCode?: string | null;
      occurredAt: Date;
    },
    context: RequestContext,
  ) {
    const runtime = await this.resolveRuntimeIfEnabled(talentId, context);

    if (!runtime) {
      return null;
    }

    return this.piiClientService.syncCustomerLifecycle(
      runtime.apiBaseUrl,
      buildCustomerPiiPlatformLifecyclePayload(
        customerId,
        talentId,
        profileType,
        lifecycle,
        context,
        runtime,
      ),
      runtime.serviceToken,
      context.tenantId,
      context.tenantSchema,
    );
  }

  private async resolveRuntime(
    talentId: string,
    context: RequestContext,
  ): Promise<CustomerPiiPlatformRuntime> {
    const runtime = await this.resolveRuntimeIfEnabled(talentId, context);

    if (!runtime) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'TCRN PII Platform is not enabled for this talent',
      });
    }

    return runtime;
  }

  private async resolveRuntimeIfEnabled(
    talentId: string,
    context: RequestContext,
  ): Promise<CustomerPiiPlatformRuntime | null> {
    const adapter = await this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TALENT,
        ownerId: talentId,
        platformCode: PII_PLATFORM_CODE,
      },
      context,
    );

    if (!adapter) {
      return null;
    }

    const runtime = resolveCustomerPiiPlatformRuntime(adapter);

    if (!runtime) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'TCRN PII Platform is not enabled for this talent',
      });
    }

    return runtime;
  }
}
