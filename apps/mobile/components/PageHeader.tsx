import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xxs },
  eyebrow: { color: theme.colors.primary, ...theme.typography.overline },
  title: { color: theme.colors.text, ...theme.typography.title },
  description: { color: theme.colors.mutedText, ...theme.typography.body },
});
