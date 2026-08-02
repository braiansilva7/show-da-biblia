import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from './AppCard';
import { theme } from '../theme';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AppCard style={styles.container}>
      <View style={styles.icon}><MaterialCommunityIcons color={theme.colors.primary} name="book-open-page-variant-outline" size={28} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  icon: { alignItems: 'center', backgroundColor: theme.colors.surfaceAccent, borderRadius: theme.radius.pill, height: 52, justifyContent: 'center', width: 52 },
  title: { color: theme.colors.text, ...theme.typography.heading },
  description: {
    color: theme.colors.mutedText,
    lineHeight: 22,
    textAlign: 'center',
  },
});
