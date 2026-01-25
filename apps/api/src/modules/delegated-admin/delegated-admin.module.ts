// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { DelegatedAdminController } from './delegated-admin.controller';
import { DelegatedAdminService } from './delegated-admin.service';

@Module({
  controllers: [DelegatedAdminController],
  providers: [DelegatedAdminService],
  exports: [DelegatedAdminService],
})
export class DelegatedAdminModule {}
