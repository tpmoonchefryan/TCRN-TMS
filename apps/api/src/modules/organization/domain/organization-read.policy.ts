// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type OrganizationTalentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface TalentSummary {
  id: string;
  code: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  lifecycleStatus: OrganizationTalentLifecycleStatus;
  publishedAt: Date | null;
  isActive: boolean;
}

export interface RawSubsidiary {
  id: string;
  parent_id: string | null;
  code: string;
  path: string;
  depth: number;
  name_en: string;
  name_zh: string | null;
  name_ja: string | null;
  is_active: boolean;
}

export interface RawTalent {
  id: string;
  subsidiary_id: string | null;
  code: string;
  name_en: string;
  name_zh: string | null;
  name_ja: string | null;
  display_name: string;
  avatar_url: string | null;
  homepage_path: string | null;
  lifecycle_status: OrganizationTalentLifecycleStatus;
  published_at: Date | null;
}

export interface OrganizationChildNodeSummary {
  id: string;
  code: string;
  name: string;
  path: string;
  depth: number;
  isActive: boolean;
  hasChildren: boolean;
  talentCount: number;
}

export interface OrganizationChildrenResult {
  subsidiaries: OrganizationChildNodeSummary[];
  talents: TalentSummary[];
}

export interface OrganizationRootNodesResult {
  tenant: { id: string; code: string; name: string };
  subsidiaries: OrganizationChildNodeSummary[];
  directTalents: TalentSummary[];
}

export interface OrganizationBreadcrumbItem {
  id: string;
  type: 'tenant' | 'subsidiary' | 'talent';
  code: string;
  name: string;
}

export const getTalentVisibilityClause = (includeInactive: boolean): string =>
  includeInactive ? '1=1' : `lifecycle_status <> 'disabled'`;

export const localizeOrganizationName = (
  record: { name_en: string; name_zh: string | null; name_ja: string | null },
  language: string,
): string =>
  (language === 'zh'
    ? record.name_zh
    : language === 'ja'
      ? record.name_ja
      : record.name_en) || record.name_en;

export const mapTalentSummary = (talent: RawTalent, language: string): TalentSummary => ({
  id: talent.id,
  code: talent.code,
  name: localizeOrganizationName(talent, language),
  displayName: talent.display_name,
  avatarUrl: talent.avatar_url,
  homepagePath: talent.homepage_path,
  lifecycleStatus: talent.lifecycle_status,
  publishedAt: talent.published_at,
  isActive: talent.lifecycle_status === 'published',
});

export const mapOrganizationChildNode = (
  subsidiary: RawSubsidiary,
  language: string,
  childCount: number,
  talentCount: number,
): OrganizationChildNodeSummary => ({
  id: subsidiary.id,
  code: subsidiary.code,
  name: localizeOrganizationName(subsidiary, language),
  path: subsidiary.path,
  depth: subsidiary.depth,
  isActive: subsidiary.is_active,
  hasChildren: childCount > 0 || talentCount > 0,
  talentCount,
});
