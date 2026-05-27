// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Global, Module } from '@nestjs/common';

import { TenantReadService } from './application/tenant-read.service';
import { TenantReadRepository } from './infrastructure/tenant-read.repository';
import { ModuleCapabilityController } from './module-capability.controller';
import { ModuleCapabilityService } from './module-capability.service';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';

@Global()
@Module({
  imports: [],
  controllers: [TenantController, ModuleCapabilityController],
  providers: [
    TenantReadRepository,
    TenantReadService,
    TenantService,
    ModuleCapabilityService,
    TenantMiddleware,
    TenantContextGuard,
  ],
  exports: [TenantService, ModuleCapabilityService, TenantMiddleware, TenantContextGuard],
})
export class TenantModule {}
