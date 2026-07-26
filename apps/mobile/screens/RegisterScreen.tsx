import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { countryApi } from '../api/countryApi';
import { AvatarCropper } from '../components/AvatarCropper';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
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
  const submit = async () => {
    if (!username || !email || !password || !countryId)
      return setError(t('requiredFields'));
    setLoading(true);
    setError(null);
    try {
      await register({
        username,
        email,
        password,
        countryId,
        languageCode,
        profilePicture: picture,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('registerError'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('register')}</Text>
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
        <PrimaryButton
          label={picture ? t('choosePhoto') : t('choosePhoto')}
          onPress={() => void choosePicture()}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? t('loading') : t('register')}
          onPress={() => void submit()}
        />
        <Text
          accessibilityRole="button"
          style={styles.link}
          onPress={() => navigation.goBack()}
        >
          {t('alreadyHaveAccount')}
        </Text>
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
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
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
  error: { color: theme.colors.error },
  countryError: { gap: theme.spacing.xs },
  link: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
  retry: { color: theme.colors.primary, fontWeight: '700' },
});
