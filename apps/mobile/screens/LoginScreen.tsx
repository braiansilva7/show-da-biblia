import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

const loginBackground = '#F7F2EA';

export function LoginScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Login'>) {
  const { width, height } = useWindowDimensions();
  const {
    biometricLoginAvailable,
    clearSessionMessage,
    login,
    loginWithBiometrics,
    sessionMessage,
  } = useAppSession();
  const { t } = useLocalization();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    route.params?.resetSuccess ? t('passwordResetSuccess') : null
  );
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const isLandscape = width > height;
  useEffect(() => {
    if (sessionMessage) {
      setError(t('sessionExpired'));
      clearSessionMessage();
    }
  }, [clearSessionMessage, sessionMessage, t]);
  const submit = async () => {
    if (!email || !password) return setError(t('requiredFields'));
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('loginError'));
    } finally {
      setLoading(false);
    }
  };
  const submitBiometricLogin = async () => {
    setBiometricLoading(true);
    setError(null);
    try {
      const result = await loginWithBiometrics(t('biometricPrompt'));
      if (result === 'failed') setError(t('biometricLoginError'));
    } catch {
      setError(t('biometricLoginError'));
    } finally {
      setBiometricLoading(false);
    }
  };
  return (
    <Screen
      backgroundColor={loginBackground}
      style={isLandscape ? styles.landscapeScreen : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isLandscape ? styles.landscapeContent : null,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isLandscape}
        showsVerticalScrollIndicator={false}
      >
        {!isLandscape ? (
          <Image
            accessibilityLabel={t('appName')}
            resizeMode="contain"
            source={require('../assets/show_biblia.png')}
            style={styles.logo}
          />
        ) : null}
        <Text
          style={[styles.brand, isLandscape ? styles.landscapeBrand : null]}
        >
          {t('appName')}
        </Text>
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <FormField
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <PrimaryButton
          label={loading ? t('loading') : t('login')}
          disabled={loading || biometricLoading}
          onPress={() => void submit()}
        />
        {biometricLoginAvailable ? (
          <PrimaryButton
            disabled={loading || biometricLoading}
            label={biometricLoading ? t('loading') : t('biometricLogin')}
            onPress={() => void submitBiometricLogin()}
          />
        ) : null}
        <Text
          accessibilityRole="button"
          style={styles.link}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          {t('forgotPassword')}
        </Text>
        <Text
          accessibilityRole="button"
          style={styles.link}
          onPress={() => navigation.navigate('Register')}
        >
          {t('createAccount')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.spacing.md, justifyContent: 'center' },
  landscapeContent: {
    gap: theme.spacing.xs,
    justifyContent: 'flex-start',
    paddingVertical: 0,
  },
  landscapeScreen: { padding: theme.spacing.sm },
  logo: { alignSelf: 'center', height: 200, width: 200 },
  brand: { color: theme.colors.secondary, fontSize: 20, fontWeight: '700' },
  landscapeBrand: { fontSize: 28, textAlign: 'center' },
  error: { color: theme.colors.error },
  notice: { color: theme.colors.success },
  link: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
});
