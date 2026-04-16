// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  localizeOrganizationName,
  mapOrganizationChildNode,
  mapTalentSummary,
  type OrganizationBreadcrumbItem,
  type OrganizationChildrenResult,
  type OrganizationRootNodesResult,
  type TalentSummary,
} from '../domain/organization-read.policy';
import { OrganizationReadRepository } from '../infrastructure/organization-read.repository';

@Injectable()
export class OrganizationReadService {
  constructor(
    private readonly organizationReadRepository: OrganizationReadRepository,
  ) {}

  async getBreadcrumb(
    tenantId: string,
    tenantSchema: string,
    path: string,
    language: string = 'en',
  ): Promise<OrganizationBreadcrumbItem[]> {
    const tenant = await this.organizationReadRepository.findTenant(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const breadcrumb: OrganizationBreadcrumbItem[] = [
      { id: tenant.id, type: 'tenant', code: tenant.code, name: tenant.name },
    ];

    const pathSegments = path.split('/').filter(Boolean);

    for (let index = 0; index < pathSegments.length; index += 1) {
      const currentPath = `/${pathSegments.slice(0, index + 1).join('/')}/`;
      const subsidiaries = await this.organizationReadRepository.findSubsidiaryByPath(
        tenantSchema,
        currentPath,
      );

      if (subsidiaries.length > 0) {
        const subsidiary = subsidiaries[0];
        breadcrumb.push({
          id: subsidiary.id,
          type: 'subsidiary',
          code: subsidiary.code,
          name: localizeOrganizationName(subsidiary, language),
        });
        continue;
      }

      const talents = await this.organizationReadRepository.findTalentByPath(
        tenantSchema,
        currentPath,
      );

      if (talents.length > 0) {
        const talent = talents[0];
        breadcrumb.push({
          id: talent.id,
          type: 'talent',
          code: talent.code,
          name: talent.display_name,
        });
      }
    }

    return breadcrumb;
  }

  async getChildren(
    tenantSchema: string,
    parentId: string | null,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      language?: string;
    } = {},
  ): Promise<OrganizationChildrenResult> {
    const {
      includeTalents = true,
      includeInactive = false,
      language = 'en',
    } = options;

    const subsidiaries = await this.organizationReadRepository.findChildSubsidiaries(
      tenantSchema,
      parentId,
      includeInactive,
    );
    const subsidiaryIds = subsidiaries.map((subsidiary) => subsidiary.id);
    const [childCountMap, talentCountMap] = await Promise.all([
      this.organizationReadRepository.countChildSubsidiaries(
        tenantSchema,
        subsidiaryIds,
        includeInactive,
      ),
      this.organizationReadRepository.countTalentsBySubsidiary(
        tenantSchema,
        subsidiaryIds,
        includeInactive,
      ),
    ]);

    const formattedSubsidiaries = subsidiaries.map((subsidiary) =>
      mapOrganizationChildNode(
        subsidiary,
        language,
        childCountMap.get(subsidiary.id) ?? 0,
        talentCountMap.get(subsidiary.id) ?? 0,
      ),
    );

    let talents: TalentSummary[] = [];

    if (includeTalents) {
      const talentResults = await this.organizationReadRepository.findTalentsByParent(
        tenantSchema,
        parentId,
        includeInactive,
      );
      talents = talentResults.map((talent) => mapTalentSummary(talent, language));
    }

    return {
      subsidiaries: formattedSubsidiaries,
      talents,
    };
  }

  async getRootNodes(
    tenantId: string,
    tenantSchema: string,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      language?: string;
    } = {},
  ): Promise<OrganizationRootNodesResult> {
    const tenant = await this.organizationReadRepository.findTenant(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const children = await this.getChildren(tenantSchema, null, options);

    return {
      tenant: {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
      },
      subsidiaries: children.subsidiaries,
      directTalents: children.talents,
    };
  }
}
