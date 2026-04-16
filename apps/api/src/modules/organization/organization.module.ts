// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { SubsidiaryModule } from '../subsidiary';
import { TalentModule } from '../talent';
import { OrganizationReadService } from './application/organization-read.service';
import { OrganizationTreeService } from './application/organization-tree.service';
import { OrganizationReadRepository } from './infrastructure/organization-read.repository';
import { OrganizationTreeRepository } from './infrastructure/organization-tree.repository';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [SubsidiaryModule, TalentModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationReadRepository,
    OrganizationTreeRepository,
    OrganizationReadService,
    OrganizationTreeService,
    OrganizationService,
  ],
  exports: [OrganizationService],
})
export class OrganizationModule {}
