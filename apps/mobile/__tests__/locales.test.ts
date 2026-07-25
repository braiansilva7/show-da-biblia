import { dictionaries, resolveLocale, translate } from '../locales';

describe('locales', () => {
  it('uses pt-BR for unsupported locales', () => {
    expect(resolveLocale('fr')).toBe('pt-BR');
  });
  it('keeps the same translation keys in every catalog', () => {
    const keys = Object.keys(dictionaries['pt-BR']).sort();
    expect(Object.keys(dictionaries.en).sort()).toEqual(keys);
    expect(Object.keys(dictionaries.es).sort()).toEqual(keys);
  });
  it('translates a key in the selected locale', () => {
    expect(translate('en', 'enter')).toBe('Continue');
  });
});
