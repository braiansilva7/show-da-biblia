import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  description: {
    color: theme.colors.mutedText,
    lineHeight: 22,
    textAlign: 'center',
  },
});
