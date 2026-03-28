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
import type { SocialLink, TalentData, TalentSettingsTab } from './types';
import {
  addSocialLink,
  normalizeSocialLinksForSave,
  removeSocialLink,
  updateSocialLink,
} from './utils';

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

  const [editedSocialLinks, setEditedSocialLinks] = useState<SocialLink[]>([]);
  const [socialLinksChanged, setSocialLinksChanged] = useState(false);

  const fetchTalent = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await talentApi.get(talentId);
      if (response.success && response.data) {
        const mappedTalent = mapTalentApiResponseToTalentData(response.data, subsidiaryId);
        setTalent(mappedTalent);
        setEditedSocialLinks(mappedTalent.socialLinks);
        setSocialLinksChanged(false);
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
        version: talent.version,
        socialLinks: normalizeSocialLinksForSave(editedSocialLinks),
      });
      setSocialLinksChanged(false);
      toast.success(tc('success'));
      await fetchTalent();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  }, [editedSocialLinks, fetchTalent, talent, talentId, tc]);

  const handleAddSocialLink = useCallback(() => {
    setEditedSocialLinks((previous) => addSocialLink(previous));
    setSocialLinksChanged(true);
  }, []);

  const handleUpdateSocialLink = useCallback(
    (index: number, field: keyof SocialLink, value: string) => {
      setEditedSocialLinks((previous) => updateSocialLink(previous, index, field, value));
      setSocialLinksChanged(true);
    },
    []
  );

  const handleRemoveSocialLink = useCallback((index: number) => {
    setEditedSocialLinks((previous) => removeSocialLink(previous, index));
    setSocialLinksChanged(true);
  }, []);

  const handleOpenSocialLink = useCallback((url: string) => {
    if (!url) {
      return;
    }

    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
  }, []);

  return {
    activeTab,
    configEntities,
    dictCounts,
    dictSearch,
    dictionaryRecords,
    editedSocialLinks,
    entitySearch,
    fetchTalent,
    handleAddSocialLink,
    handleOpenSocialLink,
    handleRemoveSocialLink,
    handleUpdateSocialLink,
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
    socialLinksChanged,
    talent,
  };
}
