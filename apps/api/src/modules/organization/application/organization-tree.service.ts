// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { mapTalentSummary } from '../domain/organization-read.policy';
import {
  buildOrganizationAccessScopes,
  buildOrganizationTree,
  collectExpandedSearchPaths,
  filterOrganizationTree,
  type OrganizationAccessScopes,
  type OrganizationTree,
} from '../domain/organization-tree.policy';
import { OrganizationTreeRepository } from '../infrastructure/organization-tree.repository';

@Injectable()
export class OrganizationTreeService {
  constructor(
    private readonly organizationTreeRepository: OrganizationTreeRepository,
  ) {}

  async getUserAccessibleScopes(
    tenantSchema: string,
    userId: string,
  ): Promise<OrganizationAccessScopes> {
    const accesses = await this.organizationTreeRepository.findUserScopeAccesses(
      tenantSchema,
      userId,
    );

    return buildOrganizationAccessScopes(accesses);
  }

  async getTree(
    tenantId: string,
    tenantSchema: string,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      search?: string;
      language?: string;
      userId?: string;
    } = {},
  ): Promise<OrganizationTree> {
    const {
      includeTalents = true,
      includeInactive = false,
      search,
      language = 'en',
      userId,
    } = options;

    const tenant = await this.organizationTreeRepository.findTenant(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const tree = search
      ? await this.getSearchedTree(tenant, tenantSchema, {
          includeTalents,
          includeInactive,
          search,
          language,
        })
      : await this.getFullTree(tenant, tenantSchema, {
          includeTalents,
          includeInactive,
          language,
        });

    if (!userId) {
      return tree;
    }

    return this.filterTreeByUserAccess(tree, tenantSchema, userId);
  }

  private async getFullTree(
    tenant: { id: string; code: string; name: string },
    tenantSchema: string,
    options: {
      includeTalents: boolean;
      includeInactive: boolean;
      language: string;
    },
  ): Promise<OrganizationTree> {
    const [subsidiaries, talentCounts, talents] = await Promise.all([
      this.organizationTreeRepository.findAllSubsidiaries(
        tenantSchema,
        options.includeInactive,
      ),
      this.organizationTreeRepository.countTalentsBySubsidiary(
        tenantSchema,
        options.includeInactive,
      ),
      options.includeTalents
        ? this.organizationTreeRepository.findTalentsForTree(
            tenantSchema,
            options.includeInactive,
          )
        : Promise.resolve([]),
    ]);

    return buildOrganizationTree({
      tenant,
      subsidiaries,
      talentCounts,
      talents,
      language: options.language,
    });
  }

  private async getSearchedTree(
    tenant: { id: string; code: string; name: string },
    tenantSchema: string,
    options: {
      includeTalents: boolean;
      includeInactive: boolean;
      search: string;
      language: string;
    },
  ): Promise<OrganizationTree> {
    const [matchedSubsidiaries, matchedTalentSubsidiaries] = await Promise.all([
      this.organizationTreeRepository.findMatchedSubsidiaryPaths(
        tenantSchema,
        options.search,
        options.includeInactive,
      ),
      this.organizationTreeRepository.findMatchedTalentSubsidiaryIds(
        tenantSchema,
        options.search,
        options.includeInactive,
      ),
    ]);

    const matchedTalentPaths =
      matchedTalentSubsidiaries.length > 0
        ? await this.organizationTreeRepository.findSubsidiaryPathsByIds(
            tenantSchema,
            matchedTalentSubsidiaries.map(
              (subsidiary) => subsidiary.subsidiary_id,
            ),
          )
        : [];
    const paths = collectExpandedSearchPaths([
      ...matchedSubsidiaries.map((subsidiary) => subsidiary.path),
      ...matchedTalentPaths.map((subsidiary) => subsidiary.path),
    ]);

    if (paths.length === 0) {
      return {
        tenant: {
          id: tenant.id,
          code: tenant.code,
          name: tenant.name,
        },
        tree: [],
        talentsWithoutSubsidiary: options.includeTalents
          ? (await this.organizationTreeRepository.findDirectTalents(
              tenantSchema,
              options.includeInactive,
              options.search,
            )).map((talent) => mapTalentSummary(talent, options.language))
          : [],
      };
    }

    const [subsidiaries, talentCounts, talents] = await Promise.all([
      this.organizationTreeRepository.findSubsidiariesByPaths(
        tenantSchema,
        paths,
      ),
      this.organizationTreeRepository.countTalentsBySubsidiary(
        tenantSchema,
        options.includeInactive,
      ),
      options.includeTalents
        ? this.organizationTreeRepository.findTalentsForTree(
            tenantSchema,
            options.includeInactive,
            options.search,
          )
        : Promise.resolve([]),
    ]);

    return buildOrganizationTree({
      tenant,
      subsidiaries,
      talentCounts,
      talents,
      language: options.language,
    });
  }

  private async filterTreeByUserAccess(
    tree: OrganizationTree,
    tenantSchema: string,
    userId: string,
  ): Promise<OrganizationTree> {
    const accessScopes = await this.getUserAccessibleScopes(tenantSchema, userId);

    if (accessScopes.tenantAccess && accessScopes.tenantIncludeSubunits) {
      return tree;
    }

    const accessibleSubsidiaryIds = new Set(accessScopes.subsidiaryIds);
    const accessibleTalentIds = new Set(accessScopes.talentIds);

    const descendantResults = await Promise.all(
      Array.from(accessScopes.subsidiaryIncludeSubunits).map((subsidiaryId) =>
        this.organizationTreeRepository.findDescendantSubsidiaryIds(
          tenantSchema,
          subsidiaryId,
        ),
      ),
    );

    for (const descendants of descendantResults) {
      for (const descendantId of descendants) {
        accessibleSubsidiaryIds.add(descendantId);
      }
    }

    const scopedTalentResults = await Promise.all(
      Array.from(accessScopes.subsidiaryIncludeSubunits).map((subsidiaryId) =>
        this.organizationTreeRepository.findTalentIdsInSubsidiarySubtree(
          tenantSchema,
          subsidiaryId,
        ),
      ),
    );

    for (const talentIds of scopedTalentResults) {
      for (const talentId of talentIds) {
        accessibleTalentIds.add(talentId);
      }
    }

    const talentSubsidiaries =
      await this.organizationTreeRepository.findTalentSubsidiaryIds(
        tenantSchema,
        Array.from(accessScopes.talentIds),
      );

    for (const talent of talentSubsidiaries) {
      if (!talent.subsidiary_id) {
        continue;
      }

      accessibleSubsidiaryIds.add(talent.subsidiary_id);
      const ancestors =
        await this.organizationTreeRepository.findAncestorSubsidiaryIds(
          tenantSchema,
          talent.subsidiary_id,
        );

      for (const ancestorId of ancestors) {
        accessibleSubsidiaryIds.add(ancestorId);
      }
    }

    return filterOrganizationTree(
      tree,
      accessibleSubsidiaryIds,
      accessibleTalentIds,
    );
  }
}
