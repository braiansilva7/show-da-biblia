import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export function Screen({
  children,
  style,
  backgroundColor,
}: PropsWithChildren<{ style?: ViewStyle; backgroundColor?: string }>) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
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
  content: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: theme.layout.contentMaxWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    width: '100%',
  },
});
