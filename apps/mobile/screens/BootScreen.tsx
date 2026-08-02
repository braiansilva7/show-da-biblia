import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalization } from '../context/LocalizationContext';
import { AppCard } from '../components/AppCard';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export function BootScreen() {
  const { t } = useLocalization();
  return (
    <Screen>
      <View style={styles.content}><AppCard style={styles.card}><Text style={styles.title}>{t('appName')}</Text><ActivityIndicator color={theme.colors.primary} /><Text style={styles.text}>{t('loading')}</Text></AppCard></View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  card: { alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.xl, width: '100%' },
  title: { color: theme.colors.primary, fontSize: 32, fontWeight: '800' },
  text: { color: theme.colors.mutedText },
});
