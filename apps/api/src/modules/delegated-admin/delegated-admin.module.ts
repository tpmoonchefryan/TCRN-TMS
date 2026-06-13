// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { DelegatedAdminController } from './delegated-admin.controller';
import { DelegatedAdminService } from './delegated-admin.service';

@Module({
  controllers: [DelegatedAdminController],
  providers: [DelegatedAdminService],
  exports: [DelegatedAdminService],
})
export class DelegatedAdminModule {}
