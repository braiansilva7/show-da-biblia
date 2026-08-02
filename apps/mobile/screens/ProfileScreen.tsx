import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { countryApi } from '../api/countryApi';
import { AppCard } from '../components/AppCard';
import { AvatarCropper } from '../components/AvatarCropper';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { PROFILE_SUCCESS_MESSAGE_DURATION_MS } from '../constants/app';
import { gameLanguages } from '../constants/languages';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import { rankingService } from '../services/rankingService';
import { theme } from '../theme';
import type { Country, ProfilePicture } from '../types/auth';
import type { Locale, MyRankings } from '../types/game';
import { profilePictureFromAsset } from '../utils/profilePicture';
import { formatDuration } from '../utils/formatDuration';

export function ProfileScreen() {
  const {
    biometricLoginEnabled,
    biometricLoginSupported,
    disableBiometricLogin,
    enableBiometricLogin,
    logout,
    updateProfile,
    user,
  } = useAppSession();
  const { t } = useLocalization();
  const [countries, setCountries] = useState<Country[]>([]);
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [countryId, setCountryId] = useState(user?.countryId ?? '');
  const [languageCode, setLanguageCode] = useState<Locale>(
    user?.languageCode ?? 'pt-BR'
  );
  const [picture, setPicture] = useState<ProfilePicture | null>(null);
  const [pictureToCrop, setPictureToCrop] = useState<ProfilePicture | null>(
    null
  );
  const [removePicture, setRemovePicture] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [rankings, setRankings] = useState<MyRankings | null>(null);
  const [rankingsError, setRankingsError] = useState(false);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const resetProfileForm = useCallback(() => {
    if (!user) return;
    setIsEditing(false);
    setUsername(user.username);
    setEmail(user.email);
    setCountryId(user.countryId);
    setLanguageCode(user.languageCode);
    setPicture(null);
    setPictureToCrop(null);
    setRemovePicture(false);
    setMessage(null);
  }, [user]);
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
  const loadRankings = useCallback(async () => {
    setRankingsLoading(true);
    setRankingsError(false);
    try {
      setRankings(await rankingService.mine());
    } catch {
      setRankingsError(true);
    }
    setRankingsLoading(false);
  }, []);
  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);
  useEffect(() => {
    void loadRankings();
  }, [loadRankings, user?.countryId, user?.totalScore]);
  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(
      () => setSuccessMessage(null),
      PROFILE_SUCCESS_MESSAGE_DURATION_MS
    );
    return () => clearTimeout(timeout);
  }, [successMessage]);
  useFocusEffect(
    useCallback(() => () => resetProfileForm(), [resetProfileForm])
  );
  if (!user) return null;
  const choosePicture = async () => {
    if (!isEditing) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setMessage(t('permissionDenied'));
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
      setRemovePicture(false);
    }
  };
  const save = async () => {
    if (!isEditing || loading) return;
    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      await updateProfile({
        username,
        email,
        countryId,
        languageCode,
        profilePicture: picture,
        removeProfilePicture: removePicture,
      });
      setPicture(null);
      setRemovePicture(false);
      setSuccessMessage(t('profileSaved'));
      setIsEditing(false);
      void loadRankings();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t('profileError'));
    } finally {
      setLoading(false);
    }
  };
  const toggleBiometricLogin = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    setBiometricMessage(null);
    try {
      if (biometricLoginEnabled) {
        await disableBiometricLogin();
        setBiometricMessage(t('biometricLoginDisabled'));
      } else {
        const result = await enableBiometricLogin(t('biometricPrompt'));
        if (result === 'success') setBiometricMessage(t('biometricLoginEnabled'));
        if (result === 'failed') setBiometricMessage(t('biometricLoginError'));
      }
    } finally {
      setBiometricLoading(false);
    }
  };
  const photoUri = picture?.uri ?? user.profilePictureUrl;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard tone="accent" style={styles.profileHero}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[styles.avatar, removePicture && styles.avatarMarked]}
            />
          ) : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{user.username.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.profileCopy}><Text style={styles.profileName}>{user.username}</Text><Text style={styles.profileEmail}>{user.email}</Text></View>
        </AppCard>
        {photoUri ? (
          <View style={styles.photoSection}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: removePicture,
                disabled: !isEditing,
              }}
              disabled={!isEditing}
              onPress={() => {
                if (!isEditing) return;
                const nextRemovePicture = !removePicture;
                setRemovePicture(nextRemovePicture);
                if (nextRemovePicture) setPicture(null);
              }}
              style={[styles.removeOption, !isEditing && styles.optionDisabled]}
            >
              <View
                style={[
                  styles.checkbox,
                  removePicture && styles.checkboxChecked,
                ]}
              >
                {removePicture ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.removeLabel}>{t('removePhoto')}</Text>
            </Pressable>
          </View>
        ) : null}
        <PageHeader title={t('profileTitle')} />
        <AppCard style={styles.performance}>
          <Text style={styles.performanceTitle}>{t('performanceTitle')}</Text>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>{t('homeScore')}</Text>
              <Text style={styles.performanceValue}>{user.totalScore}</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>{t('bestTime')}</Text>
              <Text style={styles.performanceValue}>
                {formatDuration(user.bestTimeSeconds)}
              </Text>
            </View>
          </View>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>
                {t('internationalRanking')}
              </Text>
              <Text style={styles.performanceValue}>
                {rankingsLoading
                  ? t('rankingLoading')
                  : rankings?.international
                    ? `#${rankings.international.position} · ${formatDuration(rankings.international.durationSeconds)}`
                    : t('rankingNoPosition')}
              </Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>
                {t('nationalRanking')}
              </Text>
              <Text style={styles.performanceValue}>
                {rankingsLoading
                  ? t('rankingLoading')
                  : rankings?.national
                    ? `#${rankings.national.position} · ${formatDuration(rankings.national.durationSeconds)}`
                    : t('rankingNoPosition')}
              </Text>
            </View>
          </View>
          {rankingsError ? (
            <View style={styles.rankingError}>
              <Text style={styles.error}>{t('performanceUnavailable')}</Text>
              <Text
                accessibilityRole="button"
                style={styles.retry}
                onPress={() => void loadRankings()}
              >
                {t('tryAgain')}
              </Text>
            </View>
          ) : null}
        </AppCard>
        <AppCard style={styles.biometricCard}>
          <View style={styles.biometricMainRow}>
            <View style={styles.biometricIcon}>
              <Ionicons
                color={theme.colors.primary}
                name="finger-print-outline"
                size={28}
              />
            </View>
            <View style={styles.biometricContent}>
              <Text style={styles.biometricTitle}>
                {t('biometricLoginTitle')}
              </Text>
              <Text style={styles.biometricDescription}>
                {biometricLoginSupported
                  ? t('biometricLoginDescription')
                  : t('biometricLoginUnavailable')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('biometricLoginTitle')}
              accessibilityRole="switch"
              disabled={!biometricLoginSupported || biometricLoading}
              ios_backgroundColor={theme.colors.border}
              onValueChange={() => void toggleBiometricLogin()}
              thumbColor={theme.colors.surface}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              value={biometricLoginEnabled}
            />
          </View>
          {biometricMessage ? (
            <Text style={styles.message}>{biometricMessage}</Text>
          ) : null}
        </AppCard>
        <FormField
          label={t('username')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={isEditing}
        />
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          editable={isEditing}
          keyboardType="email-address"
        />
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.select}>
          <Picker
            selectedValue={languageCode}
            onValueChange={(value) => setLanguageCode(value as Locale)}
            style={styles.picker}
            enabled={isEditing}
          >
            {gameLanguages.map(({ code, labelKey }) => (
              <Picker.Item key={code} label={t(labelKey)} value={code} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>{t('country')}</Text>
        {countriesLoading ? <Text>{t('countriesLoading')}</Text> : null}
        {countries.length ? (
          <View style={styles.select}>
            <Picker
              selectedValue={countryId}
              onValueChange={setCountryId}
              style={styles.picker}
              enabled={isEditing}
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
        {!isEditing ? (
          <PrimaryButton
            label={t('editProfile')}
            onPress={() => setIsEditing(true)}
            icon="edit"
          />
        ) : null}
        {successMessage ? (
          <Text style={styles.message}>{successMessage}</Text>
        ) : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
        {isEditing ? (
          <>
            <PrimaryButton
              label={t('choosePhoto')}
              onPress={() => void choosePicture()}
              variant="secondary"
              icon="image"
            />
            <PrimaryButton
              disabled={loading}
              label={loading ? t('loading') : t('saveProfile')}
              onPress={() => void save()}
            />
          </>
        ) : null}
        <PrimaryButton label={t('logout')} onPress={() => void logout()} variant="text" icon="logout" />
      </ScrollView>
      {pictureToCrop ? (
        <AvatarCropper
          picture={pictureToCrop}
          onCancel={() => setPictureToCrop(null)}
          onConfirm={(croppedPicture) => {
            setPicture(croppedPicture);
            setPictureToCrop(null);
            setRemovePicture(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  profileHero: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  profileCopy: { flex: 1, gap: 2 },
  profileName: { color: theme.colors.text, ...theme.typography.heading },
  profileEmail: { color: theme.colors.mutedText, ...theme.typography.caption },
  photoSection: { alignItems: 'center', gap: theme.spacing.sm },
  avatar: { alignSelf: 'center', borderRadius: 48, height: 96, width: 96 },
  avatarFallback: { alignItems: 'center', backgroundColor: theme.colors.secondary, borderRadius: 48, height: 96, justifyContent: 'center', width: 96 },
  avatarInitial: { color: theme.colors.text, fontSize: 34, fontWeight: '800' },
  avatarMarked: { opacity: 0.45 },
  removeOption: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  optionDisabled: { opacity: 0.5 },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 3,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  checkmark: { color: theme.colors.surface, fontWeight: '800' },
  removeLabel: { color: theme.colors.error, fontWeight: '600' },
  label: { color: theme.colors.text, ...theme.typography.label },
  select: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 52,
  },
  picker: { height: 52 },
  message: { color: theme.colors.success },
  error: { color: theme.colors.error },
  countryError: { gap: theme.spacing.xs },
  performance: { gap: theme.spacing.sm },
  biometricCard: { gap: theme.spacing.sm },
  biometricMainRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  biometricIcon: {
    alignItems: 'center',
    backgroundColor: '#F4EEE7',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  biometricContent: { flex: 1, gap: theme.spacing.xs },
  biometricTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  biometricDescription: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  performanceTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  performanceRow: { flexDirection: 'row', gap: theme.spacing.sm },
  performanceItem: { flex: 1, gap: theme.spacing.xs },
  performanceLabel: { color: theme.colors.mutedText, fontSize: 12 },
  performanceValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  rankingError: { gap: theme.spacing.xs },
  retry: { color: theme.colors.primary, fontWeight: '700' },
});
