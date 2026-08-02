import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useLocalization } from '../context/LocalizationContext';
import { theme } from '../theme';

export function FormField({
  label,
  secureTextEntry,
  error,
  helperText,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; error?: string; helperText?: string }) {
  const { t } = useLocalization();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const hasPasswordToggle = secureTextEntry === true;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, focused && styles.focused, error ? styles.invalid : null, !props.editable && props.editable !== undefined ? styles.disabled : null]}>
        <TextInput
          {...props}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          secureTextEntry={
            hasPasswordToggle ? !isPasswordVisible : secureTextEntry
          }
          style={styles.input}
          placeholderTextColor={theme.colors.mutedText}
        />
        {hasPasswordToggle ? (
          <Pressable
            accessibilityLabel={
              isPasswordVisible ? t('hidePassword') : t('showPassword')
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
          >
            <Ionicons
              color={theme.colors.mutedText}
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  label: { color: theme.colors.text, ...theme.typography.label },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: theme.layout.touchTarget,
  },
  focused: { borderColor: theme.colors.focus, borderWidth: 2 },
  invalid: { borderColor: theme.colors.error },
  disabled: { backgroundColor: theme.colors.surfaceMuted, opacity: 0.75 },
  input: {
    color: theme.colors.text,
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  passwordToggle: { minHeight: theme.layout.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  helper: { color: theme.colors.mutedText, ...theme.typography.caption },
  error: { color: theme.colors.error, ...theme.typography.caption },
});
