// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { type RequestContext } from '@tcrn/shared';

import { AdapterResolutionApplicationService } from '../application/adapter-resolution.service';
import type { EffectiveAdapterResolutionTarget } from '../domain/adapter-resolution.policy';

@Injectable()
export class AdapterResolutionService {
  constructor(
    private readonly adapterResolutionApplicationService: AdapterResolutionApplicationService
  ) {}

  resolveEffectiveAdapter(target: EffectiveAdapterResolutionTarget, context: RequestContext) {
    return this.adapterResolutionApplicationService.resolveEffectiveAdapter(target, context);
  }
}
