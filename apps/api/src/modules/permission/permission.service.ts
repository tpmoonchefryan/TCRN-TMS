// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

export type PermissionAction = 'read' | 'write' | 'delete' | 'execute' | 'admin';
export type PermissionEffect = 'allow' | 'deny';

export interface PermissionData {
  id: string;
  resourceCode: string;
  action: PermissionAction;
  effect: PermissionEffect;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  isSystem?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceDefinition {
  module: string;
  moduleName: string;
  resources: Array<{
    code: string;
    name: string;
    actions: PermissionAction[];
  }>;
}

/**
 * Permission Service
 * Manages permission entries using Policy + Resource tables
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
      effect?: PermissionEffect;
      isActive?: boolean;
    } = {}
  ): Promise<PermissionData[]> {
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
    if (options.effect) {
      whereClause += ` AND p.effect = $${paramIndex++}`;
      params.push(options.effect);
    }
    if (options.isActive !== undefined) {
      whereClause += ` AND p.is_active = $${paramIndex++}`;
      params.push(options.isActive);
    }

    const results = await prisma.$queryRawUnsafe<PermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        p.effect,
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
      ORDER BY r.code, p.action, p.effect
    `, ...params);

    return results;
  }

  /**
   * Get permission by ID
   */
  async findById(id: string, tenantSchema: string): Promise<PermissionData | null> {
    const results = await prisma.$queryRawUnsafe<PermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        p.effect,
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
  async findByIds(ids: string[], tenantSchema: string): Promise<PermissionData[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}::uuid`).join(',');
    const results = await prisma.$queryRawUnsafe<PermissionData[]>(`
      SELECT 
        p.id, 
        r.code as "resourceCode", 
        p.action, 
        p.effect,
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
      code: string;
      name: string;
      actions: PermissionAction[];
    }>>();
    
    for (const res of resources) {
      if (!moduleMap.has(res.module)) {
        moduleMap.set(res.module, []);
      }
      
      const name = language === 'zh' ? (res.nameZh || res.nameEn) 
                 : language === 'ja' ? (res.nameJa || res.nameEn) 
                 : res.nameEn;
      
      const actions = res.actions 
        ? res.actions.split(',').filter(a => a) as PermissionAction[]
        : [];
      
      const moduleResources = moduleMap.get(res.module);
      if (moduleResources) {
        moduleResources.push({
          code: res.code,
          name,
          actions,
        });
      }
    }

    // Module name mapping
    const moduleNames: Record<string, string> = {
      org: language === 'zh' ? '组织管理' : language === 'ja' ? '組織管理' : 'Organization',
      customer: language === 'zh' ? '客户管理' : language === 'ja' ? '顧客管理' : 'Customer',
      membership: language === 'zh' ? '会员管理' : language === 'ja' ? '会員管理' : 'Membership',
      page: language === 'zh' ? '页面管理' : language === 'ja' ? 'ページ管理' : 'Pages',
      report: language === 'zh' ? '报表管理' : language === 'ja' ? 'レポート管理' : 'Reports',
      config: language === 'zh' ? '配置管理' : language === 'ja' ? '設定管理' : 'Configuration',
      integration: language === 'zh' ? '集成管理' : language === 'ja' ? '統合管理' : 'Integration',
      system: language === 'zh' ? '系统管理' : language === 'ja' ? 'システム管理' : 'System',
    };

    const result: ResourceDefinition[] = [];
    for (const [module, resourceList] of moduleMap) {
      result.push({
        module,
        moduleName: moduleNames[module] || module,
        resources: resourceList,
      });
    }

    return result;
  }
}
