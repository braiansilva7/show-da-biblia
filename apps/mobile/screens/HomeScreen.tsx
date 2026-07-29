import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { AppTabParamList } from '../navigation/types';
import { theme } from '../theme';
import { formatDuration } from '../utils/formatDuration';

export function HomeScreen({
  navigation,
}: BottomTabScreenProps<AppTabParamList, 'Home'>) {
  const { t } = useLocalization();
  const { user } = useAppSession();
  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('homeTitle').replace('{{name}}', user?.username ?? '')}
        </Text>
        <View style={styles.profile}>
          {user?.profilePictureUrl ? (
            <Image
              source={{ uri: user.profilePictureUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text>{user?.username.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.statLabel}>{t('homeScore')}</Text>
            <Text style={styles.statValue}>{user?.totalScore ?? 0}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>{t('bestTime')}</Text>
            <Text style={styles.statValue}>
              {formatDuration(user?.bestTimeSeconds ?? null)}
            </Text>
          </View>
        </View>
        <Text style={styles.description}>{t('homeDescription')}</Text>
        <PrimaryButton
          label={t('startGame')}
          onPress={() => navigation.getParent()?.navigate('Game')}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, gap: theme.spacing.md, justifyContent: 'center' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: theme.colors.mutedText, fontSize: 16 },
  profile: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  avatar: { borderRadius: 28, height: 56, width: 56 },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  statLabel: { color: theme.colors.mutedText, fontSize: 12 },
  statValue: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
});
