import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import { theme } from '../theme';

export function AccessScreen() {
  const { enterPreview } = useAppSession();
  const { t } = useLocalization();
  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.brand}>{t('appName')}</Text>
        <Text style={styles.title}>{t('accessTitle')}</Text>
        <Text style={styles.description}>{t('accessDescription')}</Text>
        <PrimaryButton label={t('enter')} onPress={enterPreview} />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, gap: theme.spacing.md, justifyContent: 'center' },
  brand: { color: theme.colors.secondary, fontSize: 20, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: '800' },
  description: {
    color: theme.colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
});
