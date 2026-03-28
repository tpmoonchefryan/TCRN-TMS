// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  CONFIG_ENTITY_TYPES,
  type ConfigEntity,
  DICTIONARY_TYPES,
  type DictionaryRecord,
} from '@/components/shared/constants';
import { configEntityApi, dictionaryApi } from '@/lib/api/modules/configuration';
import { talentApi } from '@/lib/api/modules/talent';

import {
  mapConfigEntities,
  mapDictionaryRecords,
  mapTalentApiResponseToTalentData,
} from './mappers';
import type { TalentData, TalentSettingsTab } from './types';

interface UseTalentSettingsDataOptions {
  talentId: string;
  subsidiaryId?: string;
  tc: (key: string) => string;
}

export function useTalentSettingsData({
  talentId,
  subsidiaryId,
  tc,
}: UseTalentSettingsDataOptions) {
  const [activeTab, setActiveTab] = useState<TalentSettingsTab>('details');
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [configEntities, setConfigEntities] = useState<Record<string, ConfigEntity[]>>({});
  const [selectedEntityType, setSelectedEntityType] = useState<string>(
    CONFIG_ENTITY_TYPES[0].code
  );
  const [entitySearch, setEntitySearch] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, DictionaryRecord[]>>(
    {}
  );
  const [selectedDictType, setSelectedDictType] = useState<string>(DICTIONARY_TYPES[0].code);
  const [dictSearch, setDictSearch] = useState('');
  const [isLoadingDict, setIsLoadingDict] = useState(false);
  const [dictCounts, setDictCounts] = useState<Record<string, number>>({});

  const fetchTalent = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await talentApi.get(talentId);
      if (response.success && response.data) {
        const mappedTalent = mapTalentApiResponseToTalentData(response.data, subsidiaryId);
        setTalent(mappedTalent);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [talentId, subsidiaryId, tc]);

  const fetchConfigEntities = useCallback(
    async (entityType: string) => {
      setIsLoadingConfig(true);
      try {
        const response = await configEntityApi.list(entityType, {
          scopeType: 'talent',
          scopeId: talentId,
          includeInherited: true,
        });
        if (response.success && response.data) {
          setConfigEntities((previous) => ({
            ...previous,
            [entityType]: mapConfigEntities(response.data ?? []),
          }));
        }
      } catch {
        // Keep empty array on error.
      } finally {
        setIsLoadingConfig(false);
      }
    },
    [talentId]
  );

  const fetchDictionaryRecords = useCallback(async (dictType: string) => {
    setIsLoadingDict(true);
    try {
      const response = await dictionaryApi.getByType(dictType);
      if (response.success && response.data) {
        const records = mapDictionaryRecords(response.data ?? []);
        setDictionaryRecords((previous) => ({
          ...previous,
          [dictType]: records,
        }));
        setDictCounts((previous) => ({
          ...previous,
          [dictType]: records.length,
        }));
      }
    } catch {
      // Keep empty array on error.
    } finally {
      setIsLoadingDict(false);
    }
  }, []);

  useEffect(() => {
    void fetchTalent();
  }, [fetchTalent]);

  useEffect(() => {
    if (activeTab === 'config') {
      void fetchConfigEntities(selectedEntityType);
    }
  }, [activeTab, fetchConfigEntities, selectedEntityType]);

  useEffect(() => {
    if (activeTab === 'dictionary') {
      void fetchDictionaryRecords(selectedDictType);
    }
  }, [activeTab, fetchDictionaryRecords, selectedDictType]);

  const saveTalent = useCallback(async () => {
    if (!talent) {
      return;
    }

    setIsSaving(true);
    try {
      await talentApi.update(talentId, {
        displayName: talent.displayName,
        homepagePath: talent.homepagePath,
        timezone: talent.timezone,
        settings: talent.settings,
        version: talent.version,
      });
      toast.success(tc('success'));
      await fetchTalent();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  }, [fetchTalent, talent, talentId, tc]);

  return {
    activeTab,
    configEntities,
    dictCounts,
    dictSearch,
    dictionaryRecords,
    entitySearch,
    fetchTalent,
    isLoading,
    isLoadingConfig,
    isLoadingDict,
    isSaving,
    saveTalent,
    selectedDictType,
    selectedEntityType,
    setActiveTab,
    setDictSearch,
    setSelectedDictType,
    setSelectedEntityType,
    setTalent,
    setEntitySearch,
    talent,
  };
}
