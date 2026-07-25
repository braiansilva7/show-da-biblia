import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalization } from '../context/LocalizationContext';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export function BootScreen() {
  const { t } = useLocalization();
  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>{t('appName')}</Text>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.text}>{t('loading')}</Text>
      </View>
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
  title: { color: theme.colors.primary, fontSize: 32, fontWeight: '800' },
  text: { color: theme.colors.mutedText },
});
