// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { SystemUserController } from './system-user.controller';
import { SystemUserService } from './system-user.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [SystemUserController],
  providers: [SystemUserService],
  exports: [SystemUserService],
})
export class SystemUserModule {}
