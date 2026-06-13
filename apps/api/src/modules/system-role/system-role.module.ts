// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database';
import { SystemRoleController } from './system-role.controller';
import { SystemRoleService } from './system-role.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemRoleController],
  providers: [SystemRoleService],
})
export class SystemRoleModule {}
