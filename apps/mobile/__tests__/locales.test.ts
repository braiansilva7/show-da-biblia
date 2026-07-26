import { dictionaries, resolveLocale, translate } from '../locales';
import { PROFILE_SUCCESS_MESSAGE_DURATION_MS } from '../constants/app';
import { gameLanguages } from '../constants/languages';

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
  it('exposes readable game-language labels in Portuguese', () => {
    expect(
      gameLanguages.map(({ labelKey }) => translate('pt-BR', labelKey))
    ).toEqual(['Português', 'Espanhol', 'Inglês']);
  });
  it('keeps the profile success message duration short', () => {
    expect(PROFILE_SUCCESS_MESSAGE_DURATION_MS).toBe(3_000);
  });
});
