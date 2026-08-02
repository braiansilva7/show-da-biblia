import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import { theme } from '../theme';
import { getPayPalDonationUrl, isPayPalDonationUrl, openPayPalDonation } from '../utils/paypalDonation';

export function AboutScreen() {
  const { locale, t } = useLocalization();
  const [donationError, setDonationError] = useState(false);
  const donationUrl = getPayPalDonationUrl(locale);
  const donationAvailable = isPayPalDonationUrl(donationUrl);
  const donate = async () => { setDonationError(false); if (!(await openPayPalDonation(donationUrl))) setDonationError(true); };
  return <Screen><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow={t('appName')} title={t('aboutTitle')} />
    <AppCard tone="accent" style={styles.mission}><View style={styles.missionIcon}><MaterialCommunityIcons color={theme.colors.secondary} name="book-cross" size={30} /></View><Text style={styles.description}>{t('aboutMission')}</Text></AppCard>
    <AppCard><Text style={styles.description}>{t('aboutCollaboration')}</Text></AppCard>
    <AppCard style={styles.contact}><MaterialCommunityIcons color={theme.colors.primary} name="email-outline" size={24} /><View style={styles.contactCopy}><Text style={styles.contactText}>{t('aboutContact')}</Text><Text style={styles.email}>{t('aboutContactEmail')}</Text></View></AppCard>
    <AppCard tone="warning" style={styles.donationCard}><View style={styles.donationHeader}><MaterialCommunityIcons color={theme.colors.primary} name="hand-heart" size={26} /><Text style={styles.donationTitle}>{t('aboutSupportTitle')}</Text></View><Text style={styles.description}>{t('aboutSupportDescription')}</Text><PrimaryButton disabled={!donationAvailable} icon="heart" label={t('donate')} onPress={() => void donate()} />{!donationAvailable ? <Text style={styles.unavailable}>{t('donationUnavailable')}</Text> : null}{donationError ? <Text style={styles.error}>{t('donationError')}</Text> : null}</AppCard>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl }, mission: { alignItems: 'center', gap: theme.spacing.md }, missionIcon: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill, height: 58, justifyContent: 'center', width: 58 },
  description: { color: theme.colors.mutedText, ...theme.typography.body },
  contact: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm }, contactCopy: { flex: 1, gap: 2 }, contactText: { color: theme.colors.text, ...theme.typography.label }, email: { color: theme.colors.primary, fontWeight: '800' },
  donationCard: { gap: theme.spacing.md }, donationHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm }, donationTitle: { color: theme.colors.text, ...theme.typography.heading }, unavailable: { color: theme.colors.mutedText, ...theme.typography.caption }, error: { color: theme.colors.error, ...theme.typography.caption },
});
