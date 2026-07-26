import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../api/authApi';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Step = 'email' | 'code' | 'password';

export function ForgotPasswordScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>) {
  const { t } = useLocalization();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t('passwordResetError')
      );
    } finally {
      setLoading(false);
    }
  };
  const sendCode = () =>
    void run(async () => {
      if (!email.trim()) throw new Error(t('requiredFields'));
      await authApi.sendPasswordResetCode(email.trim());
      setMessage(t('passwordResetCodeSent'));
      setStep('code');
    });
  const verifyCode = () =>
    void run(async () => {
      if (!code.trim()) throw new Error(t('requiredFields'));
      const verification = await authApi.verifyPasswordResetCode(
        email.trim(),
        code.trim()
      );
      setResetToken(verification.resetToken);
      setStep('password');
    });
  const savePassword = () =>
    void run(async () => {
      if (!resetToken || !password || !confirmation)
        throw new Error(t('requiredFields'));
      if (password !== confirmation) throw new Error(t('passwordsDoNotMatch'));
      await authApi.resetPassword(resetToken, password, confirmation);
      setResetToken(null);
      navigation.replace('Login', { resetSuccess: true });
    });

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>{t('forgotPassword')}</Text>
        <Text style={styles.description}>
          {step === 'email'
            ? t('forgotPasswordEmailDescription')
            : step === 'code'
              ? t('forgotPasswordCodeDescription')
              : t('forgotPasswordNewPasswordDescription')}
        </Text>
        {step === 'email' ? (
          <FormField
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        ) : null}
        {step === 'code' ? (
          <FormField
            label={t('recoveryCode')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        ) : null}
        {step === 'password' ? (
          <>
            <FormField
              label={t('newPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <FormField
              label={t('confirmPassword')}
              value={confirmation}
              onChangeText={setConfirmation}
              secureTextEntry
              autoComplete="new-password"
            />
          </>
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={
            loading
              ? t('loading')
              : step === 'email'
                ? t('sendCode')
                : step === 'code'
                  ? t('verifyCode')
                  : t('resetPassword')
          }
          onPress={
            step === 'email'
              ? sendCode
              : step === 'code'
                ? verifyCode
                : savePassword
          }
        />
        {step === 'code' ? (
          <Text
            accessibilityRole="button"
            style={styles.link}
            onPress={sendCode}
          >
            {t('resendCode')}
          </Text>
        ) : null}
        <Text
          accessibilityRole="button"
          style={styles.link}
          onPress={() => navigation.replace('Login')}
        >
          {t('backToLogin')}
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, gap: theme.spacing.md, justifyContent: 'center' },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '800' },
  description: { color: theme.colors.mutedText },
  error: { color: theme.colors.error },
  message: { color: theme.colors.success },
  link: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
});
