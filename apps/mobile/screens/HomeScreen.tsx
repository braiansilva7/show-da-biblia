import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { AppTabParamList } from '../navigation/types';
import { theme } from '../theme';
import { formatDuration } from '../utils/formatDuration';

function Stat({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string | number }) {
  return <View style={styles.stat}><View style={styles.statIcon}><MaterialCommunityIcons color={theme.colors.primary} name={icon} size={20} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

export function HomeScreen({ navigation }: BottomTabScreenProps<AppTabParamList, 'Home'>) {
  const { t } = useLocalization();
  const { user } = useAppSession();
  const name = user?.username ?? '';
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow={t('appName')} title={t('homeTitle').replace('{{name}}', name)} description={t('homeDescription')} />
        <AppCard tone="accent" style={styles.hero}>
          {user?.profilePictureUrl ? <Image source={{ uri: user.profilePictureUrl }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.heroCopy}><Text style={styles.heroLabel}>{t('performanceTitle')}</Text><Text style={styles.heroName}>{name}</Text><Text style={styles.heroDescription}>{t('homeDescription')}</Text></View>
        </AppCard>
        <View style={styles.stats}>
          <Stat icon="star-four-points" label={t('homeScore')} value={user?.totalScore ?? 0} />
          <Stat icon="timer-outline" label={t('bestTime')} value={formatDuration(user?.bestTimeSeconds ?? null)} />
        </View>
        <AppCard style={styles.playCard}>
          <View style={styles.playIcon}><MaterialCommunityIcons color={theme.colors.secondary} name="book-open-page-variant" size={30} /></View>
          <Text style={styles.playTitle}>{t('startGame')}</Text>
          <Text style={styles.playDescription}>{t('homeDescription')}</Text>
          <PrimaryButton icon="play" label={t('startGame')} onPress={() => navigation.getParent()?.navigate('Game')} />
        </AppCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  hero: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  avatar: { borderColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: 3, height: 68, width: 68 },
  avatarPlaceholder: { alignItems: 'center', backgroundColor: theme.colors.secondary, borderColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: 3, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  heroCopy: { flex: 1, gap: 2 }, heroLabel: { color: theme.colors.primary, ...theme.typography.overline }, heroName: { color: theme.colors.text, ...theme.typography.heading }, heroDescription: { color: theme.colors.mutedText, ...theme.typography.caption },
  stats: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flex: 1, gap: 2, padding: theme.spacing.sm, ...theme.shadow.card },
  statIcon: { alignItems: 'center', backgroundColor: theme.colors.surfaceAccent, borderRadius: theme.radius.pill, height: 36, justifyContent: 'center', width: 36 },
  statValue: { color: theme.colors.text, fontSize: 21, fontWeight: '900' }, statLabel: { color: theme.colors.mutedText, ...theme.typography.caption },
  playCard: { alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg },
  playIcon: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill, height: 60, justifyContent: 'center', width: 60 },
  playTitle: { color: theme.colors.text, ...theme.typography.heading }, playDescription: { color: theme.colors.mutedText, textAlign: 'center', ...theme.typography.body },
});
