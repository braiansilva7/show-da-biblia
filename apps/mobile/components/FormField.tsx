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
  ...props
}: TextInputProps & { label: string }) {
  const { t } = useLocalization();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const hasPasswordToggle = secureTextEntry === true;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          {...props}
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
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  label: { color: theme.colors.text, fontWeight: '600' },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    padding: theme.spacing.md,
  },
  passwordToggle: { paddingHorizontal: theme.spacing.md },
});
