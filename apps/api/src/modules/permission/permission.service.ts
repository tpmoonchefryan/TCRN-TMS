// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import {
  getRbacResourceDefinition,
  isCanonicalPermissionAction,
  type LocalizedPermissionData,
  type PermissionAction as RbacPermissionAction,
  RBAC_MODULE_LABELS,
  type RbacResourceCode,
  type ResourceDefinition,
} from '@tcrn/shared';

export type PermissionAction = RbacPermissionAction;

/**
 * Permission Service
 * Manages discrete permission definitions using Policy + Resource tables.
 */
@Injectable()
export class PermissionService {
  /**
   * Get all permissions (policies with resources)
   */
  async list(
    tenantSchema: string,
    options: {
      resourceCode?: string;
      action?: PermissionAction;
      isActive?: boolean;
    } = {}
  ): Promise<LocalizedPermissionData[]> {
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.resourceCode) {
      whereClause += ` AND r.code = $${paramIndex++}`;
      params.push(options.resourceCode);
    }
    if (options.action) {
      whereClause += ` AND p.action = $${paramIndex++}`;
      params.push(options.action);
    }
    if (options.isActive !== undefined) {
      whereClause += ` AND p.is_active = $${paramIndex++}`;
      params.push(options.isActive);
    }

    const results = await prisma.$queryRawUnsafe<LocalizedPermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        r.name_en as "nameEn", 
        r.name_zh as "nameZh", 
        r.name_ja as "nameJa",
        p.description, 
        p.is_active as "isActive",
        p.created_at as "createdAt", 
        p.updated_at as "updatedAt"
      FROM "${tenantSchema}".policy p
      JOIN "${tenantSchema}".resource r ON r.id = p.resource_id
      WHERE ${whereClause}
      ORDER BY r.code, p.action
    `, ...params);

    return results;
  }

  /**
   * Get permission by ID
   */
  async findById(id: string, tenantSchema: string): Promise<LocalizedPermissionData | null> {
    const results = await prisma.$queryRawUnsafe<LocalizedPermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        r.name_en as "nameEn", 
        r.name_zh as "nameZh", 
        r.name_ja as "nameJa",
        p.description, 
        p.is_active as "isActive",
        p.created_at as "createdAt", 
        p.updated_at as "updatedAt"
      FROM "${tenantSchema}".policy p
      JOIN "${tenantSchema}".resource r ON r.id = p.resource_id
      WHERE p.id = $1::uuid
    `, id);
    return results[0] || null;
  }

  /**
   * Get permissions by IDs
   */
  async findByIds(ids: string[], tenantSchema: string): Promise<LocalizedPermissionData[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}::uuid`).join(',');
    const results = await prisma.$queryRawUnsafe<LocalizedPermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        r.name_en as "nameEn", 
        r.name_zh as "nameZh", 
        r.name_ja as "nameJa",
        p.description, 
        p.is_active as "isActive",
        p.created_at as "createdAt", 
        p.updated_at as "updatedAt"
      FROM "${tenantSchema}".policy p
      JOIN "${tenantSchema}".resource r ON r.id = p.resource_id
      WHERE p.id IN (${placeholders})
    `, ...ids);

    return results;
  }

  /**
   * Get resource definitions for UI
   * Note: Resources and policies are defined in tenant_template schema (global definitions)
   */
  async getResourceDefinitions(_tenantSchema: string, language: string = 'en'): Promise<ResourceDefinition[]> {
    // Get all resources with their associated policy actions from tenant_template (global definitions)
    const resources = await prisma.$queryRawUnsafe<Array<{
      code: string;
      module: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      actions: string;
    }>>(`
      SELECT 
        r.code,
        r.module,
        r.name_en as "nameEn", 
        r.name_zh as "nameZh", 
        r.name_ja as "nameJa",
        COALESCE(string_agg(DISTINCT p.action, ','), '') as actions
      FROM "tenant_template".resource r
      LEFT JOIN "tenant_template".policy p ON p.resource_id = r.id AND p.is_active = true
      WHERE r.is_active = true
      GROUP BY r.id, r.code, r.module, r.name_en, r.name_zh, r.name_ja, r.sort_order
      ORDER BY r.module, r.sort_order, r.code
    `);

    // Group by module
    const moduleMap = new Map<string, Array<{
      code: RbacResourceCode;
      name: string;
      actions: PermissionAction[];
    }>>();
    
    for (const res of resources) {
      const definition = getRbacResourceDefinition(res.code);
      if (!definition) {
        continue;
      }

      if (!moduleMap.has(definition.module)) {
        moduleMap.set(definition.module, []);
      }
      
      const name = language === 'zh' ? (res.nameZh || res.nameEn) 
                 : language === 'ja' ? (res.nameJa || res.nameEn) 
                 : res.nameEn;
      
      const actions = res.actions
        ? res.actions.split(',').filter(isCanonicalPermissionAction)
        : [];
      
      const moduleResources = moduleMap.get(definition.module);
      if (moduleResources) {
        moduleResources.push({
          code: definition.code as RbacResourceCode,
          name,
          actions,
        });
      }
    }

    const result: ResourceDefinition[] = [];
    for (const [module, resourceList] of moduleMap) {
      const moduleLabels = RBAC_MODULE_LABELS[module as keyof typeof RBAC_MODULE_LABELS];
      const moduleName = moduleLabels
        ? (language === 'zh' ? moduleLabels.zh : language === 'ja' ? moduleLabels.ja : moduleLabels.en)
        : module;

      result.push({
        module,
        moduleName,
        resources: resourceList,
      });
    }

    return result;
  }
}
