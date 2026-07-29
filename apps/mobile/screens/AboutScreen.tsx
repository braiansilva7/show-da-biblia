import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PAYPAL_DONATION_URL } from '../config';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import { theme } from '../theme';
import {
  isPayPalDonationUrl,
  openPayPalDonation,
} from '../utils/paypalDonation';

export function AboutScreen() {
  const { t } = useLocalization();
  const [donationError, setDonationError] = useState(false);
  const donationAvailable = isPayPalDonationUrl(PAYPAL_DONATION_URL);
  const donate = async () => {
    setDonationError(false);
    if (!(await openPayPalDonation(PAYPAL_DONATION_URL))) {
      setDonationError(true);
    }
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('aboutTitle')}</Text>
        <Text style={styles.description}>{t('aboutMission')}</Text>
        <Text style={styles.description}>{t('aboutCollaboration')}</Text>

        <View style={styles.contact}>
          <Text style={styles.contactText}>{t('aboutContact')}</Text>
          <Text style={styles.email}>{t('aboutContactEmail')}</Text>
        </View>

        <View style={styles.donationCard}>
          <Text style={styles.donationTitle}>{t('aboutSupportTitle')}</Text>
          <Text style={styles.donationDescription}>
            {t('aboutSupportDescription')}
          </Text>
          <PrimaryButton
            disabled={!donationAvailable}
            label={t('donate')}
            onPress={() => void donate()}
          />
          {!donationAvailable ? (
            <Text style={styles.unavailable}>{t('donationUnavailable')}</Text>
          ) : null}
          {donationError ? (
            <Text style={styles.error}>{t('donationError')}</Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: theme.colors.mutedText, fontSize: 16, lineHeight: 24 },
  contact: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  contactText: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  email: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  donationCard: {
    backgroundColor: '#F7E9D6',
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  donationTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '800' },
  donationDescription: {
    color: theme.colors.text,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  unavailable: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 19 },
  error: { color: theme.colors.error, fontSize: 13, lineHeight: 19 },
});
