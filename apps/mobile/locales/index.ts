import { DEFAULT_LOCALE } from '../constants/app';
import type { Locale } from '../types/game';
import { en } from './en';
import { es } from './es';
import { ptBR } from './pt-BR';

export const dictionaries = { 'pt-BR': ptBR, en, es } as const;
export type TranslationKey = keyof typeof ptBR;
export type TranslationDictionary = Record<TranslationKey, string>;

export function resolveLocale(value?: string | null): Locale {
  return value === 'en' || value === 'es' || value === 'pt-BR'
    ? value
    : DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[resolveLocale(locale)][key];
}
