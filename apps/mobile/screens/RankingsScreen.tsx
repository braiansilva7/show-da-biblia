import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';

export function RankingsScreen() {
  const { t } = useLocalization();
  return (
    <Screen>
      <EmptyState
        title={t('rankingsTitle')}
        description={t('rankingsDescription')}
      />
    </Screen>
  );
}
