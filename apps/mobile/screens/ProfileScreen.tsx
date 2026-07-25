import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';

export function ProfileScreen() {
  const { t } = useLocalization();
  return (
    <Screen>
      <EmptyState
        title={t('profileTitle')}
        description={t('profileDescription')}
      />
    </Screen>
  );
}
