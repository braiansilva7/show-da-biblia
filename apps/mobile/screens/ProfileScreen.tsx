import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { countryApi } from '../api/countryApi';
import { AvatarCropper } from '../components/AvatarCropper';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { PROFILE_SUCCESS_MESSAGE_DURATION_MS } from '../constants/app';
import { gameLanguages } from '../constants/languages';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import { theme } from '../theme';
import type { Country, ProfilePicture } from '../types/auth';
import type { Locale } from '../types/game';
import { profilePictureFromAsset } from '../utils/profilePicture';

export function ProfileScreen() {
  const { user, updateProfile, logout } = useAppSession();
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
  const [loading, setLoading] = useState(false);
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
  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(
      () => setSuccessMessage(null),
      PROFILE_SUCCESS_MESSAGE_DURATION_MS
    );
    return () => clearTimeout(timeout);
  }, [successMessage]);
  if (!user) return null;
  const choosePicture = async () => {
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
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t('profileError'));
    } finally {
      setLoading(false);
    }
  };
  const photoUri = picture?.uri ?? user.profilePictureUrl;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {photoUri ? (
          <View style={styles.photoSection}>
            <Image
              source={{ uri: photoUri }}
              style={[styles.avatar, removePicture && styles.avatarMarked]}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: removePicture }}
              onPress={() => {
                const nextRemovePicture = !removePicture;
                setRemovePicture(nextRemovePicture);
                if (nextRemovePicture) setPicture(null);
              }}
              style={styles.removeOption}
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
        <Text style={styles.title}>{t('profileTitle')}</Text>
        <FormField
          label={t('username')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
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
        {countriesLoading ? <Text>{t('countriesLoading')}</Text> : null}
        {countries.length ? (
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
        <PrimaryButton
          label={t('choosePhoto')}
          onPress={() => void choosePicture()}
        />
        {successMessage ? (
          <Text style={styles.message}>{successMessage}</Text>
        ) : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton
          label={loading ? t('loading') : t('saveProfile')}
          onPress={() => void save()}
        />
        <Text
          accessibilityRole="button"
          style={styles.logout}
          onPress={() => void logout()}
        >
          {t('logout')}
        </Text>
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
  photoSection: { alignItems: 'center', gap: theme.spacing.sm },
  avatar: { alignSelf: 'center', borderRadius: 48, height: 96, width: 96 },
  avatarMarked: { opacity: 0.45 },
  removeOption: { alignItems: 'center', flexDirection: 'row', gap: 8 },
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
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  label: { color: theme.colors.text, fontWeight: '600' },
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
  logout: { color: theme.colors.error, fontWeight: '700', textAlign: 'center' },
  retry: { color: theme.colors.primary, fontWeight: '700' },
});
