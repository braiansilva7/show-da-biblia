import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';

export function GameScreen(
  _: NativeStackScreenProps<RootStackParamList, 'Game'>
) {
  const { t } = useLocalization();
  return (
    <Screen>
      <EmptyState title={t('gameTitle')} description={t('gameDescription')} />
    </Screen>
  );
}
