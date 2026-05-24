import {
  normalizeLocalizedText,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';

export function localizedFixture(en: string, values: PartialLocalizedText = {}): LocalizedText {
  return normalizeLocalizedText(
    {
      en,
      ...values,
    },
    en
  );
}
