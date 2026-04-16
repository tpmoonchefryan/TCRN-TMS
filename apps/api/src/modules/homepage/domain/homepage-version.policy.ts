// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  HomepageContent,
  ThemeConfig,
  VersionListItem,
} from '../dto/homepage.dto';

export interface HomepageVersionActorRecord {
  id: string;
  username: string;
}

export interface HomepageVersionListRecord {
  id: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  content: unknown;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface HomepageVersionDetailRecord {
  id: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  content: unknown;
  theme: unknown;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface HomepageVersionRestoreSourceRecord {
  id: string;
  versionNumber: number;
  content: unknown;
  theme: unknown;
  contentHash: string | null;
}

export interface HomepageVersionCreatedRecord {
  id: string;
  versionNumber: number;
}

export interface HomepageVersionDetail {
  id: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  content: HomepageContent;
  theme: ThemeConfig;
  publishedAt: string | null;
  publishedBy: HomepageVersionActorRecord | null;
  createdAt: string;
  createdBy: HomepageVersionActorRecord | null;
}

export const collectHomepageVersionActorIds = (
  ...actorIds: Array<string | null | undefined>
): string[] => Array.from(new Set(actorIds.filter((actorId): actorId is string => Boolean(actorId))));

export const buildHomepageVersionActorMap = (
  actors: HomepageVersionActorRecord[],
): Map<string, HomepageVersionActorRecord> => new Map(actors.map((actor) => [actor.id, actor]));

export const generateHomepageContentPreview = (content: HomepageContent): string => {
  if (!content?.components || content.components.length === 0) {
    return 'Empty page';
  }

  const componentTypes = content.components.map((component) => component.type);
  const uniqueTypes = [...new Set(componentTypes)];

  if (uniqueTypes.length <= 3) {
    return uniqueTypes.join(', ');
  }

  return `${uniqueTypes.slice(0, 3).join(', ')}... (+${uniqueTypes.length - 3})`;
};

export const buildHomepageVersionListItem = (params: {
  version: HomepageVersionListRecord;
  actorMap: Map<string, HomepageVersionActorRecord>;
}): VersionListItem => {
  const { actorMap, version } = params;
  const content = version.content as HomepageContent;

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    contentPreview: generateHomepageContentPreview(content),
    componentCount: content?.components?.length ?? 0,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    publishedBy: version.publishedBy ? actorMap.get(version.publishedBy) ?? null : null,
    createdAt: version.createdAt.toISOString(),
    createdBy: version.createdBy ? actorMap.get(version.createdBy) ?? null : null,
  };
};

export const buildHomepageVersionDetail = (params: {
  version: HomepageVersionDetailRecord;
  actorMap: Map<string, HomepageVersionActorRecord>;
}): HomepageVersionDetail => {
  const { actorMap, version } = params;

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    content: version.content as HomepageContent,
    theme: version.theme as ThemeConfig,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    publishedBy: version.publishedBy ? actorMap.get(version.publishedBy) ?? null : null,
    createdAt: version.createdAt.toISOString(),
    createdBy: version.createdBy ? actorMap.get(version.createdBy) ?? null : null,
  };
};

export const buildHomepageVersionRestoreDiff = (
  restoredFromVersion: number,
): string =>
  JSON.stringify({
    new: { restoredFromVersion },
  });

export const buildHomepageVersionRestoreResult = (params: {
  newDraftVersion: HomepageVersionCreatedRecord;
  restoredFrom: HomepageVersionRestoreSourceRecord;
}) => {
  const { newDraftVersion, restoredFrom } = params;

  return {
    newDraftVersion: {
      id: newDraftVersion.id,
      versionNumber: newDraftVersion.versionNumber,
    },
    restoredFrom: {
      id: restoredFrom.id,
      versionNumber: restoredFrom.versionNumber,
    },
  };
};
