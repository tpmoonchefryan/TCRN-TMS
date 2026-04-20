'use client';

import { useSettingsFamilyCopy } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

export function useSystemDictionaryCopy() {
  const { currentLocale, selectedLocale, dictionaryExplorerCopy, text } = useSettingsFamilyCopy();

  return {
    currentLocale,
    selectedLocale,
    dictionaryExplorerCopy,
    text,
  };
}
