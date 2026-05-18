'use client';

import { useSettingsFamilyCopy } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

export function useSystemDictionaryCopy() {
  const { locale, dictionaryExplorerCopy, text } = useSettingsFamilyCopy();

  return {
    locale,
    dictionaryExplorerCopy,
    text,
  };
}
