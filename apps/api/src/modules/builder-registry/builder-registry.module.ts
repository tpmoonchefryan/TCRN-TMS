import { Module } from '@nestjs/common';

import { ApiRegistryModule } from '../api-registry';
import { TenantModule } from '../tenant';
import { BuilderRegistryController } from './builder-registry.controller';
import { BuilderRegistryService } from './builder-registry.service';

@Module({
  imports: [ApiRegistryModule, TenantModule],
  controllers: [BuilderRegistryController],
  providers: [BuilderRegistryService],
  exports: [BuilderRegistryService],
})
export class BuilderRegistryModule {}
