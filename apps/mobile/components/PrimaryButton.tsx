import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export function primaryButtonStyle(pressed: boolean, disabled: boolean) {
  return [
    styles.button,
    pressed && !disabled && styles.buttonPressed,
    disabled && styles.buttonDisabled,
  ];
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ color: `${theme.colors.onPrimary}33` }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => primaryButtonStyle(pressed, disabled)}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.5 },
  label: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
