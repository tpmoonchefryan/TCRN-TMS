// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { TalentLifecycleStatus } from './talent-read.policy';

export interface TalentCreateInput {
  subsidiaryId?: string | null;
  profileStoreId: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  extraData?: Record<string, unknown> | null;
  displayName: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  avatarUrl?: string;
  homepagePath?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

export interface TalentUpdateInput {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  extraData?: Record<string, unknown> | null;
  displayName?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  avatarUrl?: string;
  homepagePath?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
  version: number;
}

export interface TalentDeleteInput {
  version: number;
}

export interface TalentDeleteResult {
  id: string;
  deleted: true;
}

export interface TalentDeleteProtectedDependencyCounts {
  customerProfiles: number;
  customerAccessLogs: number;
  importJobs: number;
  exportJobs: number;
  marshmallowExportJobs: number;
  reportJobs: number;
  marshmallowMessages: number;
}

export interface TalentDeleteBlockedDependency {
  code: string;
  count: number;
  message: string;
}

export type TalentDeleteExecutionResult =
  | {
      outcome: 'deleted';
      id: string;
    }
  | {
      outcome: 'not_found';
    }
  | {
      outcome: 'version_mismatch';
      currentVersion: number;
    }
  | {
      outcome: 'lifecycle_conflict';
      lifecycleStatus: TalentLifecycleStatus;
    }
  | {
      outcome: 'protected_dependency';
      dependencies: TalentDeleteProtectedDependencyCounts;
    };

const TALENT_DELETE_DEPENDENCY_DEFINITIONS: Array<{
  key: keyof TalentDeleteProtectedDependencyCounts;
  code: string;
  message: string;
}> = [
  {
    key: 'customerProfiles',
    code: 'CUSTOMER_PROFILE_EXISTS',
    message: 'Customer profiles already exist for this talent.',
  },
  {
    key: 'customerAccessLogs',
    code: 'CUSTOMER_ACCESS_LOG_EXISTS',
    message: 'Customer access logs already exist for this talent.',
  },
  {
    key: 'importJobs',
    code: 'IMPORT_JOB_EXISTS',
    message: 'Import job history already exists for this talent.',
  },
  {
    key: 'exportJobs',
    code: 'EXPORT_JOB_EXISTS',
    message: 'Export job history already exists for this talent.',
  },
  {
    key: 'marshmallowExportJobs',
    code: 'MARSHMALLOW_EXPORT_JOB_EXISTS',
    message: 'Marshmallow export job history already exists for this talent.',
  },
  {
    key: 'reportJobs',
    code: 'REPORT_JOB_EXISTS',
    message: 'Report job history already exists for this talent.',
  },
  {
    key: 'marshmallowMessages',
    code: 'MARSHMALLOW_MESSAGE_EXISTS',
    message: 'Marshmallow messages already exist for this talent.',
  },
];

export const EMPTY_TALENT_DELETE_DEPENDENCIES: TalentDeleteProtectedDependencyCounts = {
  customerProfiles: 0,
  customerAccessLogs: 0,
  importJobs: 0,
  exportJobs: 0,
  marshmallowExportJobs: 0,
  reportJobs: 0,
  marshmallowMessages: 0,
};

export const canHardDeleteTalent = (
  lifecycleStatus: TalentLifecycleStatus,
): boolean => lifecycleStatus === 'draft';

export const hasProtectedTalentDeleteDependencies = (
  dependencies: TalentDeleteProtectedDependencyCounts,
): boolean =>
  TALENT_DELETE_DEPENDENCY_DEFINITIONS.some(
    ({ key }) => dependencies[key] > 0,
  );

export const buildTalentDeleteBlockedDependencies = (
  dependencies: TalentDeleteProtectedDependencyCounts,
): TalentDeleteBlockedDependency[] =>
  TALENT_DELETE_DEPENDENCY_DEFINITIONS.flatMap(({ key, code, message }) =>
    dependencies[key] > 0
      ? [
          {
            code,
            count: dependencies[key],
            message,
          },
        ]
      : [],
  );

export const buildTalentPath = (
  code: string,
  subsidiaryPath?: string | null,
): string => (subsidiaryPath ? `${subsidiaryPath}${code}/` : `/${code}/`);

export const buildTalentDefaultSettings = (
  settings?: Record<string, unknown>,
): Record<string, unknown> => ({
  homepageEnabled: true,
  marshmallowEnabled: true,
  inheritTimezone: true,
  ...(settings || {}),
});

export const buildTalentUpdateMutation = (
  data: TalentUpdateInput,
  userId: string,
) => {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 3;

  if (data.nameEn !== undefined) {
    updates.push(`name_en = $${paramIndex++}`);
    params.push(data.nameEn);
  }
  if (data.nameZh !== undefined) {
    updates.push(`name_zh = $${paramIndex++}`);
    params.push(data.nameZh);
  }
  if (data.nameJa !== undefined) {
    updates.push(`name_ja = $${paramIndex++}`);
    params.push(data.nameJa);
  }
  if (data.extraData !== undefined) {
    updates.push(`extra_data = $${paramIndex++}::jsonb`);
    params.push(data.extraData ? JSON.stringify(data.extraData) : null);
  }
  if (data.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    params.push(data.displayName);
  }
  if (data.descriptionEn !== undefined) {
    updates.push(`description_en = $${paramIndex++}`);
    params.push(data.descriptionEn);
  }
  if (data.descriptionZh !== undefined) {
    updates.push(`description_zh = $${paramIndex++}`);
    params.push(data.descriptionZh);
  }
  if (data.descriptionJa !== undefined) {
    updates.push(`description_ja = $${paramIndex++}`);
    params.push(data.descriptionJa);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    params.push(data.avatarUrl);
  }
  if (data.homepagePath !== undefined) {
    updates.push(`homepage_path = $${paramIndex++}`);
    params.push(data.homepagePath);
  }
  if (data.timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    params.push(data.timezone);
  }
  if (data.settings !== undefined) {
    updates.push(`settings = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(data.settings));
  }

  updates.push('updated_at = now()');
  updates.push('updated_by = $2::uuid');
  updates.push('version = version + 1');

  return {
    updates,
    params: [userId, ...params],
  };
};
