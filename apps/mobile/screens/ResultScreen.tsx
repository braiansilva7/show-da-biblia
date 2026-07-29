import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { formatDuration } from '../utils/formatDuration';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const MAX_CORRECT_ANSWERS = 30;

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons
        color={theme.colors.primary}
        name={icon}
        size={24}
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function ResultScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Result'>) {
  const { t } = useLocalization();
  const { refreshUser } = useAppSession();
  const { summary } = route.params;
  const cardsUsed = summary.jokers.reduce(
    (total, item) => total + item.quantityUsed,
    0
  );
  const itemsUsed = summary.skipsUsed + cardsUsed;
  const usedJokers = summary.jokers.filter((item) => item.quantityUsed > 0);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              color={theme.colors.secondary}
              name="trophy-outline"
              size={36}
            />
          </View>
          <Text style={styles.title}>{t('resultTitle')}</Text>
          <Text style={styles.description}>{t('resultDescription')}</Text>
          <Text style={styles.score}>{summary.score}</Text>
          <Text style={styles.scoreLabel}>{t('score')}</Text>
        </View>

        <View style={styles.metrics}>
          <ResultMetric
            icon="check-decagram-outline"
            label={t('correctAnswers')}
            value={`${summary.correctAnswers}/${MAX_CORRECT_ANSWERS}`}
          />
          <ResultMetric
            icon="timer-outline"
            label={t('time')}
            value={formatDuration(summary.durationSeconds)}
          />
          <ResultMetric
            icon="cards-outline"
            label={t('itemsUsed')}
            value={itemsUsed}
          />
          <ResultMetric
            icon="stairs"
            label={t('unlockedLevel')}
            value={summary.highestUnlockedLevel}
          />
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>{t('itemsUsed')}</Text>
          <View style={styles.itemSummary}>
            <Text style={styles.itemLabel}>{t('skipsUsed')}</Text>
            <Text style={styles.itemValue}>{summary.skipsUsed}</Text>
          </View>
          <View style={styles.itemSummary}>
            <Text style={styles.itemLabel}>{t('cardsUsed')}</Text>
            <Text style={styles.itemValue}>{cardsUsed}</Text>
          </View>
          {usedJokers.length ? (
            <View style={styles.jokers}>
              {usedJokers.map((item) => (
                <View key={item.code} style={styles.jokerRow}>
                  <Text style={styles.jokerName}>
                    {t(
                      item.code === 'REVEAL_ANSWER'
                        ? 'jokerReveal'
                        : 'jokerEliminate'
                    )}
                  </Text>
                  <Text style={styles.jokerValue}>{item.quantityUsed}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noItems}>{t('noItemsUsed')}</Text>
          )}
        </View>

        <PrimaryButton
          label={t('backHome')}
          onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  hero: {
    alignItems: 'center',
    backgroundColor: '#F7E9D6',
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  description: {
    color: theme.colors.mutedText,
    lineHeight: 20,
    textAlign: 'center',
  },
  score: { color: theme.colors.primary, fontSize: 52, fontWeight: '900' },
  scoreLabel: { color: theme.colors.mutedText, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metricCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    minWidth: 140,
    padding: theme.spacing.md,
  },
  metricLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
  },
  metricValue: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  itemsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  itemsTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  itemSummary: { flexDirection: 'row', justifyContent: 'space-between' },
  itemLabel: { color: theme.colors.mutedText },
  itemValue: { color: theme.colors.text, fontWeight: '800' },
  jokers: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  jokerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  jokerName: { color: theme.colors.text },
  jokerValue: { color: theme.colors.primary, fontWeight: '800' },
  noItems: { color: theme.colors.mutedText },
});
