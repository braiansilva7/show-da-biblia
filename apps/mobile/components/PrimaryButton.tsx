import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';

export function primaryButtonStyle(pressed: boolean, disabled: boolean, variant: Variant = 'primary') {
  return [
    styles.button,
    styles[variant],
    pressed && !disabled && styles.buttonPressed,
    disabled && styles.buttonDisabled,
  ];
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: AppIconName;
}) {
  const textColor = variant === 'primary' || variant === 'danger' ? theme.colors.onPrimary : theme.colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ color: `${theme.colors.onPrimary}33` }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => primaryButtonStyle(pressed, disabled, variant)}
    >
      <View style={styles.content}>
        {icon ? <AppIcon color={textColor} name={icon} size={20} /> : null}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  content: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.xs },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surfaceAccent, borderColor: theme.colors.primary, borderWidth: 1 },
  text: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.colors.error },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '800' },
});
