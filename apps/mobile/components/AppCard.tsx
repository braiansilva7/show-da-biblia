import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '../theme';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'error';

export function AppCard({
  children,
  style,
  tone = 'default',
  ...props
}: PropsWithChildren<ViewProps & { tone?: Tone }>) {
  return (
    <View
      {...props}
      style={[styles.card, styles[tone], style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...theme.shadow.card,
  },
  default: {},
  accent: { backgroundColor: theme.colors.surfaceAccent },
  success: { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.success },
  warning: { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.secondary },
  error: { backgroundColor: theme.colors.errorSurface, borderColor: theme.colors.error },
});
