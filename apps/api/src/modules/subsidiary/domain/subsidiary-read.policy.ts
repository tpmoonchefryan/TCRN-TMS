// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  localizedTextOrderExpression,
  localizedTextSearchExpression,
} from '../../../platform/persistence/localized-text.persistence';
import type { LocalizedText } from '@tcrn/shared';

export interface SubsidiaryData {
  id: string;
  parentId: string | null;
  code: string;
  path: string;
  depth: number;
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  description: LocalizedText;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SubsidiaryListOptions {
  page?: number;
  pageSize?: number;
  parentId?: string | null;
  search?: string;
  isActive?: boolean;
  sort?: string;
}

export interface SubsidiaryListQuery {
  whereClause: string;
  params: unknown[];
  orderBy: string;
  pageSize: number;
  offset: number;
}

export const buildSubsidiaryListQuery = (
  options: SubsidiaryListOptions = {},
): SubsidiaryListQuery => {
  const {
    page = 1,
    pageSize = 20,
    parentId,
    search,
    isActive,
    sort,
  } = options;
  const offset = (page - 1) * pageSize;

  let whereClause = '1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (parentId !== undefined) {
    if (parentId === null) {
      whereClause += ' AND parent_id IS NULL';
    } else {
      whereClause += ` AND parent_id = $${paramIndex++}`;
      params.push(parentId);
    }
  }

  if (search) {
    whereClause += ` AND (code ILIKE $${paramIndex} OR ${localizedTextSearchExpression('name', `$${paramIndex}`)})`;
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (isActive !== undefined) {
    whereClause += ` AND is_active = $${paramIndex++}`;
    params.push(isActive);
  }

  return {
    whereClause,
    params,
    orderBy: getSubsidiaryListOrder(sort),
    pageSize,
    offset,
  };
};

const getSubsidiaryListOrder = (sort?: string): string => {
  if (!sort) {
    return 'sort_order ASC, created_at DESC';
  }

  const isDesc = sort.startsWith('-');
  const field = isDesc ? sort.substring(1) : sort;
  const fieldMap: Record<string, string> = {
    code: 'code',
    name: localizedTextOrderExpression('name'),
    sortOrder: 'sort_order',
    createdAt: 'created_at',
  };
  const dbField = fieldMap[field] || 'sort_order';

  return `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
};
