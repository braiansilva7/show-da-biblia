import type { TranslationKey } from '../locales';
import type { Locale } from '../types/game';

export const gameLanguages: ReadonlyArray<{
  code: Locale;
  labelKey: TranslationKey;
}> = [
  { code: 'pt-BR', labelKey: 'languagePortuguese' },
  { code: 'es', labelKey: 'languageSpanish' },
  { code: 'en', labelKey: 'languageEnglish' },
];
