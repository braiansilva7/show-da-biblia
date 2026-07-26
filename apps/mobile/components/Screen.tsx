import type { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '../theme';

export function Screen({
  children,
  style,
  backgroundColor,
}: PropsWithChildren<{ style?: ViewStyle; backgroundColor?: string }>) {
  return (
    <SafeAreaView
      style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]}
    >
      <View
        style={[
          styles.content,
          backgroundColor ? { backgroundColor } : null,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg },
});
