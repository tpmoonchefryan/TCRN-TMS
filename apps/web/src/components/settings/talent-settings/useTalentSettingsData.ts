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
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import { configEntityApi, dictionaryApi } from '@/lib/api/modules/configuration';
import { talentApi } from '@/lib/api/modules/talent';

import {
  mapConfigEntities,
  mapDictionaryRecords,
  mapTalentApiResponseToTalentData,
} from './mappers';
import type { TalentData, TalentReadiness, TalentSettingsTab } from './types';

interface UseTalentSettingsDataOptions {
  talentId: string;
  subsidiaryId?: string;
  tc: (key: string) => string;
  te: (key: string) => string;
  activeTab?: TalentSettingsTab;
  selectedEntityType?: string;
  entitySearch?: string;
  selectedDictType?: string;
  dictSearch?: string;
}

export function useTalentSettingsData({
  talentId,
  subsidiaryId,
  tc,
  te,
  activeTab = 'details',
  selectedEntityType = CONFIG_ENTITY_TYPES[0].code,
  entitySearch = '',
  selectedDictType = DICTIONARY_TYPES[0].code,
  dictSearch = '',
}: UseTalentSettingsDataOptions) {
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [publishReadiness, setPublishReadiness] = useState<TalentReadiness | null>(null);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);
  const [isLifecycleMutating, setIsLifecycleMutating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [configEntities, setConfigEntities] = useState<Record<string, ConfigEntity[]>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, DictionaryRecord[]>>(
    {}
  );
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
    } catch (error) {
      toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
    } finally {
      setIsLoading(false);
    }
  }, [subsidiaryId, talentId, te]);

  const fetchPublishReadiness = useCallback(async () => {
    setIsLoadingReadiness(true);
    try {
      const response = await talentApi.getPublishReadiness(talentId);
      if (response.success && response.data) {
        setPublishReadiness(response.data);
      }
    } catch {
      setPublishReadiness(null);
    } finally {
      setIsLoadingReadiness(false);
    }
  }, [talentId]);

  const refreshTalentContext = useCallback(async () => {
    await Promise.all([fetchTalent(), fetchPublishReadiness()]);
  }, [fetchPublishReadiness, fetchTalent]);

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
    void fetchPublishReadiness();
  }, [fetchPublishReadiness]);

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
        avatarUrl: talent.avatarUrl ?? undefined,
        homepagePath: talent.homepagePath,
        timezone: talent.timezone,
        settings: talent.settings,
        version: talent.version,
      });
      toast.success(tc('success'));
      await refreshTalentContext();
    } catch (error) {
      toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
    } finally {
      setIsSaving(false);
    }
  }, [refreshTalentContext, talent, talentId, tc, te]);

  const runLifecycleAction = useCallback(
    async (action: 'publish' | 'disable' | 'reEnable') => {
      if (!talent) {
        return false;
      }

      setIsLifecycleMutating(true);
      try {
        const response = await (
          action === 'publish'
            ? talentApi.publish(talentId, { version: talent.version })
            : action === 'disable'
              ? talentApi.disable(talentId, { version: talent.version })
              : talentApi.reEnable(talentId, { version: talent.version })
        );
        const lifecycleData = response.data;

        if (response.success && lifecycleData) {
          setTalent((current) =>
            current
              ? {
                  ...current,
                  lifecycleStatus: lifecycleData.lifecycleStatus,
                  publishedAt: lifecycleData.publishedAt,
                  isActive: lifecycleData.isActive,
                  version: lifecycleData.version,
                }
              : current
          );
          toast.success(tc('success'));
          await refreshTalentContext();
          return true;
        }

        return false;
      } catch (error) {
        toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
        return false;
      } finally {
        setIsLifecycleMutating(false);
      }
    },
    [refreshTalentContext, talent, talentId, tc, te]
  );

  const deleteTalent = useCallback(async () => {
    if (!talent || talent.lifecycleStatus !== 'draft') {
      return false;
    }

    setIsDeleting(true);
    try {
      const response = await talentApi.delete(talentId, talent.version);

      if (response.success && response.data?.deleted) {
        toast.success(tc('success'));
        return true;
      }

      return false;
    } catch (error) {
      toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [talent, talentId, tc, te]);

  return {
    activeTab,
    configEntities,
    deleteTalent,
    dictCounts,
    dictSearch,
    dictionaryRecords,
    entitySearch,
    fetchTalent,
    fetchPublishReadiness,
    isLoading,
    isLoadingConfig,
    isLoadingDict,
    isLoadingReadiness,
    isDeleting,
    isLifecycleMutating,
    isSaving,
    publishReadiness,
    publishTalent: () => runLifecycleAction('publish'),
    disableTalent: () => runLifecycleAction('disable'),
    reEnableTalent: () => runLifecycleAction('reEnable'),
    refreshTalentContext,
    saveTalent,
    selectedDictType,
    selectedEntityType,
    setTalent,
    talent,
  };
}
