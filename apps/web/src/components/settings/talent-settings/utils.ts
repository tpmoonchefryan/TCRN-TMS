// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConfigEntity, DictionaryRecord } from '@/components/shared/constants';

export function filterConfigEntities(
  configEntities: Record<string, ConfigEntity[]>,
  selectedEntityType: string,
  entitySearch: string
): ConfigEntity[] {
  const entities = configEntities[selectedEntityType] || [];
  if (!entitySearch) {
    return entities;
  }

  const search = entitySearch.toLowerCase();
  return entities.filter(
    (entity) =>
      entity.code.toLowerCase().includes(search) ||
      entity.nameEn.toLowerCase().includes(search) ||
      entity.nameZh.toLowerCase().includes(search)
  );
}

export function filterDictionaryRecords(
  dictionaryRecords: Record<string, DictionaryRecord[]>,
  selectedDictType: string,
  dictSearch: string
): DictionaryRecord[] {
  const records = dictionaryRecords[selectedDictType] || [];
  if (!dictSearch) {
    return records;
  }

  const search = dictSearch.toLowerCase();
  return records.filter(
    (record) =>
      record.code.toLowerCase().includes(search) ||
      record.nameEn.toLowerCase().includes(search) ||
      record.nameZh.toLowerCase().includes(search)
  );
}

export function countLocalConfigEntities(
  configEntities: Record<string, ConfigEntity[]>
): number {
  return Object.values(configEntities)
    .flat()
    .filter((entity) => entity.ownerType === 'talent').length;
}

export function countInheritedConfigEntities(
  configEntities: Record<string, ConfigEntity[]>
): number {
  return Object.values(configEntities)
    .flat()
    .filter((entity) => Boolean(entity.inheritedFrom)).length;
}
