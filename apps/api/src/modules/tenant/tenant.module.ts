// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';

import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';
import { TenantContextGuard } from './tenant-context.guard';

@Global()
@Module({
  imports: [],
  controllers: [TenantController],
  providers: [TenantService, TenantMiddleware, TenantContextGuard],
  exports: [TenantService, TenantMiddleware, TenantContextGuard],
})
export class TenantModule {}
