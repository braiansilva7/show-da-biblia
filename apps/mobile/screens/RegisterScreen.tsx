import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../components/AppCard';
import { countryApi } from '../api/countryApi';
import { authApi } from '../api/authApi';
import { AvatarCropper } from '../components/AvatarCropper';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { gameLanguages } from '../constants/languages';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import type { Country, ProfilePicture } from '../types/auth';
import type { Locale } from '../types/game';
import { profilePictureFromAsset } from '../utils/profilePicture';
export function RegisterScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Register'>) {
  const { register } = useAppSession();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const [countries, setCountries] = useState<Country[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryId, setCountryId] = useState('');
  const [languageCode, setLanguageCode] = useState<Locale>('pt-BR');
  const [picture, setPicture] = useState<ProfilePicture | null>(null);
  const [pictureToCrop, setPictureToCrop] = useState<ProfilePicture | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [lastCheckedUsername, setLastCheckedUsername] = useState('');
  const usernameRef = useRef(username);
  const loadCountries = useCallback(async () => {
    setCountriesLoading(true);
    setCountriesError(null);
    try {
      setCountries(await countryApi.list());
    } catch {
      setCountriesError(t('countriesError'));
    } finally {
      setCountriesLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);
  const choosePicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError(t('permissionDenied'));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const selectedPicture = profilePictureFromAsset(result.assets[0]);
      if (Platform.OS === 'web') setPictureToCrop(selectedPicture);
      else setPicture(selectedPicture);
    }
  };
  const requestCode = async () => {
    if (!username || !email || !password || !countryId)
      return setError(t('requiredFields'));
    if (usernameStatus === 'taken') return setError(t('usernameUnavailable'));
    if (usernameStatus === 'checking') return setError(t('usernameChecking'));
    setLoading(true);
    setError(null);
    try {
      await authApi.requestRegistrationEmailCode(email.trim(), languageCode);
      setVerificationRequested(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('registerError'));
    } finally {
      setLoading(false);
    }
  };
  const updateUsername = (value: string) => {
    usernameRef.current = value;
    setUsername(value);
    if (value.trim().toLowerCase() !== lastCheckedUsername) setUsernameStatus('idle');
  };
  const checkUsernameAvailability = async () => {
    const candidate = username.trim();
    if (candidate.length < 3 || candidate.toLowerCase() === lastCheckedUsername) return;
    setUsernameStatus('checking');
    try {
      const available = await authApi.checkUsernameAvailability(candidate);
      if (usernameRef.current.trim().toLowerCase() !== candidate.toLowerCase()) return;
      setLastCheckedUsername(candidate.toLowerCase());
      setUsernameStatus(available ? 'available' : 'taken');
    } catch {
      if (usernameRef.current.trim().toLowerCase() === candidate.toLowerCase()) setUsernameStatus('error');
    }
  };
  const verifyAndRegister = async () => {
    if (!/^\d{6}$/.test(verificationCode)) return setError(t('verificationCodeRequired'));
    setLoading(true);
    setError(null);
    try {
      const verification = await authApi.verifyRegistrationEmailCode(email.trim(), verificationCode);
      await register({ username, email, password, countryId, languageCode, profilePicture: picture }, verification.registrationToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('registerError'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(theme.spacing.xxl, insets.bottom + theme.spacing.xl) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={verificationRequested ? t('verifyEmailTitle') : t('register')} eyebrow={t('appName')} />
        {verificationRequested ? (
          <AppCard style={styles.card}>
            <Text style={styles.description}>{t('verifyEmailDescription')}</Text>
            <FormField label={t('verificationCode')} value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" autoCapitalize="none" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={loading ? t('loading') : t('verifyAndCreateAccount')} onPress={() => void verifyAndRegister()} />
            <Text accessibilityRole="button" style={styles.link} onPress={() => void requestCode()}>{t('resendCode')}</Text>
            <Text accessibilityRole="button" style={styles.link} onPress={() => { setVerificationRequested(false); setVerificationCode(''); setError(null); }}>{t('changeEmail')}</Text>
          </AppCard>
        ) : <>
        <AppCard style={styles.photoCard}>
          <View style={styles.photoInfo}>
            <View style={styles.photoPreview}>{picture ? <Image source={{ uri: picture.uri }} style={styles.avatar} /> : <Text style={styles.avatarText}>{t('choosePhoto')}</Text>}</View>
            <View style={styles.photoCopy}><Text style={styles.photoTitle}>{t('choosePhoto')}</Text><Text style={styles.description}>{t('profilePictureOptional')}</Text></View>
          </View>
          <PrimaryButton label={t('choosePhoto')} onPress={() => void choosePicture()} variant="secondary" icon="image" />
        </AppCard>
        <AppCard style={styles.card}>
        <FormField
          label={t('username')}
          value={username}
          onChangeText={updateUsername}
          onBlur={() => void checkUsernameAvailability()}
          autoCapitalize="none"
        />
        {usernameStatus === 'checking' ? <Text style={styles.description}>{t('usernameChecking')}</Text> : null}
        {usernameStatus === 'available' ? <Text style={styles.available}>{t('usernameAvailable')}</Text> : null}
        {usernameStatus === 'taken' ? <Text style={styles.error}>{t('usernameUnavailable')}</Text> : null}
        {usernameStatus === 'error' ? <Text style={styles.error}>{t('usernameCheckError')}</Text> : null}
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FormField
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.select}>
          <Picker
            selectedValue={languageCode}
            onValueChange={(value) => setLanguageCode(value as Locale)}
            style={styles.picker}
          >
            {gameLanguages.map(({ code, labelKey }) => (
              <Picker.Item key={code} label={t(labelKey)} value={code} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>{t('country')}</Text>
        {countriesLoading ? (
          <Text>{t('countriesLoading')}</Text>
        ) : countries.length ? (
          <View style={styles.select}>
            <Picker
              selectedValue={countryId}
              onValueChange={setCountryId}
              style={styles.picker}
            >
              <Picker.Item label={t('selectCountry')} value="" />
              {countries.map((country) => (
                <Picker.Item
                  key={country.id}
                  label={country.name}
                  value={country.id}
                />
              ))}
            </Picker>
          </View>
        ) : null}
        {countriesError ? (
          <View style={styles.countryError}>
            <Text style={styles.error}>{countriesError}</Text>
            <Text
              accessibilityRole="button"
              style={styles.retry}
              onPress={() => void loadCountries()}
            >
              {t('tryAgain')}
            </Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? t('loading') : t('sendVerificationCode')}
          onPress={() => void requestCode()}
          disabled={usernameStatus === 'taken'}
        />
        </AppCard>
        </>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('alreadyHaveAccount')}
          hitSlop={theme.spacing.xs}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.accountLink}>{t('alreadyHaveAccount')}</Text>
        </Pressable>
      </ScrollView>
      {pictureToCrop ? (
        <AvatarCropper
          picture={pictureToCrop}
          onCancel={() => setPictureToCrop(null)}
          onConfirm={(croppedPicture) => {
            setPicture(croppedPicture);
            setPictureToCrop(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.spacing.md },
  description: { color: theme.colors.text },
  card: { gap: theme.spacing.md },
  photoCard: { gap: theme.spacing.md, padding: theme.spacing.md },
  photoInfo: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  photoPreview: { alignItems: 'center', backgroundColor: theme.colors.surfaceAccent, borderRadius: theme.radius.pill, height: 58, justifyContent: 'center', overflow: 'hidden', width: 58 },
  avatar: { height: 58, width: 58 },
  avatarText: { color: theme.colors.mutedText, fontSize: 10, paddingHorizontal: 6, textAlign: 'center' },
  photoCopy: { flex: 1, gap: theme.spacing.xs },
  photoTitle: { color: theme.colors.text, ...theme.typography.label },
  available: { color: theme.colors.primary, fontWeight: '600' },
  label: { color: theme.colors.text, ...theme.typography.label },
  select: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 52,
  },
  picker: { height: 52 },
  error: { color: theme.colors.error },
  countryError: { gap: theme.spacing.xs },
  link: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
  accountLink: { color: theme.colors.primary, fontWeight: '800', minHeight: theme.layout.touchTarget, paddingVertical: theme.spacing.sm, textAlign: 'center' },
  retry: { color: theme.colors.primary, fontWeight: '700' },
});
