// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type TalentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface TalentData {
  id: string;
  subsidiaryId: string | null;
  profileStoreId: string | null;
  code: string;
  path: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  displayName: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: Date | null;
  publishedBy: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface TalentLifecycleIssue {
  code: string;
  message: string;
}

export interface TalentPublishReadiness {
  id: string;
  lifecycleStatus: TalentLifecycleStatus;
  targetState: 'published';
  recommendedAction: 'publish' | 're-enable' | null;
  canEnterPublishedState: boolean;
  blockers: TalentLifecycleIssue[];
  warnings: TalentLifecycleIssue[];
  version: number;
}

export interface TalentProfileStoreRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isDefault: boolean;
  piiProxyUrl: string | null;
}

export interface TalentStats {
  customerCount: number;
  pendingMessagesCount: number;
}

export interface TalentExternalPagesDomainConfig {
  homepage: {
    isPublished: boolean;
    customDomain: string | null;
    customDomainVerified: boolean;
    customDomainVerificationToken: string | null;
  } | null;
  marshmallow: {
    isEnabled: boolean;
    path: string | null;
    customDomain: string | null;
    customDomainVerified: boolean;
    customDomainVerificationToken: string | null;
  } | null;
}

export interface TalentListOptions {
  page?: number;
  pageSize?: number;
  subsidiaryId?: string | null;
  search?: string;
  isActive?: boolean;
  sort?: string;
}

export const TALENT_SELECT_FIELDS = `
  id,
  subsidiary_id as "subsidiaryId",
  profile_store_id as "profileStoreId",
  code,
  path,
  name_en as "nameEn",
  name_zh as "nameZh",
  name_ja as "nameJa",
  display_name as "displayName",
  description_en as "descriptionEn",
  description_zh as "descriptionZh",
  description_ja as "descriptionJa",
  avatar_url as "avatarUrl",
  homepage_path as "homepagePath",
  timezone,
  lifecycle_status as "lifecycleStatus",
  published_at as "publishedAt",
  published_by as "publishedBy",
  CASE
    WHEN lifecycle_status = 'published' THEN true
    ELSE false
  END as "isActive",
  settings,
  created_at as "createdAt",
  updated_at as "updatedAt",
  version
`;

export const getReadinessAction = (
  lifecycleStatus: TalentLifecycleStatus,
): TalentPublishReadiness['recommendedAction'] => {
  if (lifecycleStatus === 'draft') {
    return 'publish';
  }

  if (lifecycleStatus === 'disabled') {
    return 're-enable';
  }

  return null;
};

export const buildTalentListQuery = (options: TalentListOptions = {}) => {
  const {
    page = 1,
    pageSize = 20,
    subsidiaryId,
    search,
    isActive,
    sort,
  } = options;
  const offset = (page - 1) * pageSize;
  let whereClause = `lifecycle_status <> 'disabled'`;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (subsidiaryId !== undefined) {
    if (subsidiaryId === null) {
      whereClause += ' AND subsidiary_id IS NULL';
    } else {
      whereClause += ` AND subsidiary_id = $${paramIndex++}`;
      params.push(subsidiaryId);
    }
  }

  if (search) {
    whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (isActive !== undefined) {
    whereClause += ` AND lifecycle_status = $${paramIndex++}`;
    params.push(isActive ? 'published' : 'disabled');
  }

  let orderBy = 'created_at DESC';
  if (sort) {
    const isDesc = sort.startsWith('-');
    const field = isDesc ? sort.substring(1) : sort;
    const fieldMap: Record<string, string> = {
      code: 'code',
      name: 'name_en',
      displayName: 'display_name',
      createdAt: 'created_at',
    };
    const dbField = fieldMap[field] || 'created_at';
    orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
  }

  return {
    whereClause,
    params,
    orderBy,
    limit: pageSize,
    offset,
  };
};
