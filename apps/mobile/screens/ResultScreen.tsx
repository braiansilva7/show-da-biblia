import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';

export function ResultScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Result'>) {
  const { t } = useLocalization();
  return (
    <Screen>
      <EmptyState
        title={t('resultTitle')}
        description={t('resultDescription')}
      />
      <PrimaryButton
        label={t('backHome')}
        onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}
      />
    </Screen>
  );
}
