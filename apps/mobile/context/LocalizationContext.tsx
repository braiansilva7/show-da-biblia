import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { resolveLocale, translate, type TranslationKey } from '../locales';
import type { Locale } from '../types/game';

type LocalizationValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocalizationContext = createContext<LocalizationValue | null>(null);

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>(resolveLocale());
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey) => translate(locale, key),
    }),
    [locale]
  );
  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (!value)
    throw new Error('useLocalization must be used inside LocalizationProvider');
  return value;
}
