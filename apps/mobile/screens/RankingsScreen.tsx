import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import { rankingService } from '../services/rankingService';
import { theme } from '../theme';
import type { PlayerRanking, RankingEntry, RankingScope } from '../types/game';
import { formatDuration } from '../utils/formatDuration';

const PAGE_SIZE = 20;

function Avatar({ uri, username }: { uri: string | null; username: string }) {
  return uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>
        {username.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const { t } = useLocalization();
  return (
    <View style={styles.row}>
      <Text style={styles.position}>
        #{entry.position} · {formatDuration(entry.durationSeconds)}
      </Text>
      <Avatar uri={entry.profilePictureUrl} username={entry.username} />
      <View style={styles.player}>
        <Text style={styles.username}>{entry.username}</Text>
        <Text style={styles.country}>{entry.countryName}</Text>
      </View>
      <View style={styles.score}>
        <Text style={styles.scoreValue}>{entry.score}</Text>
        <Text style={styles.scoreLabel}>{t('score')}</Text>
      </View>
    </View>
  );
}

function MyRankingCard({
  ranking,
  scope,
}: {
  ranking: PlayerRanking | null;
  scope: RankingScope;
}) {
  const { t } = useLocalization();
  const { user } = useAppSession();
  if (!user) return null;
  return (
    <View style={styles.myCard}>
      <Text style={styles.myTitle}>{t('yourRanking')}</Text>
      {ranking ? (
        <View style={styles.myContent}>
          <Avatar uri={user.profilePictureUrl} username={user.username} />
          <View style={styles.player}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.myScope}>
              {scope === 'international'
                ? t('internationalRanking')
                : t('nationalRanking')}
            </Text>
          </View>
          <View style={styles.score}>
            <Text style={styles.position}>
              #{ranking.position} · {formatDuration(ranking.durationSeconds)}
            </Text>
            <Text style={styles.scoreValue}>{ranking.score}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.myUnranked}>{t('rankingUnranked')}</Text>
      )}
    </View>
  );
}

export function RankingsScreen() {
  const { t } = useLocalization();
  const [scope, setScope] = useState<RankingScope>('national');
  const [items, setItems] = useState<RankingEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [myRanking, setMyRanking] = useState<PlayerRanking | null>(null);
  const [myRankingLoaded, setMyRankingLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);

  const load = useCallback(
    async (targetScope: RankingScope, targetPage: number, append: boolean) => {
      const sequence = requestSequence.current + 1;
      requestSequence.current = sequence;
      append ? setLoadingMore(true) : setLoading(true);
      setError(false);
      try {
        const rankingPage = await rankingService.list(
          targetScope,
          targetPage,
          PAGE_SIZE
        );
        if (requestSequence.current !== sequence) return;
        setItems((current) =>
          append ? [...current, ...rankingPage.items] : rankingPage.items
        );
        setPage(rankingPage.page);
        setTotal(rankingPage.total);
        if (!append) {
          try {
            const mine = await rankingService.mine();
            if (requestSequence.current !== sequence) return;
            setMyRanking(mine[targetScope]);
            setMyRankingLoaded(true);
          } catch {
            if (requestSequence.current === sequence) setMyRankingLoaded(false);
          }
        }
      } catch {
        if (requestSequence.current === sequence) setError(true);
      } finally {
        if (requestSequence.current === sequence)
          append ? setLoadingMore(false) : setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(scope, 1, false);
  }, [load, scope]);

  const changeScope = (nextScope: RankingScope) => {
    if (nextScope === scope) return;
    setScope(nextScope);
    setItems([]);
    setPage(1);
    setTotal(0);
    setMyRanking(null);
    setMyRankingLoaded(false);
  };
  const hasMore = items.length < total;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('rankingsTitle')}</Text>
        <View style={styles.tabs}>
          {(['national', 'international'] as const).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === item }}
              key={item}
              onPress={() => changeScope(item)}
              style={[styles.tab, scope === item && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, scope === item && styles.tabTextActive]}
              >
                {item === 'international'
                  ? t('internationalRanking')
                  : t('nationalRanking')}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <Text style={styles.loading}>{t('rankingLoading')}</Text>
        ) : null}
        {error ? (
          <View style={styles.errorState}>
            <Text style={styles.error}>{t('rankingError')}</Text>
            <PrimaryButton
              label={t('tryAgain')}
              onPress={() => void load(scope, 1, false)}
            />
          </View>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <EmptyState
            title={t('rankingEmptyTitle')}
            description={t('rankingEmptyDescription')}
          />
        ) : null}
        {!loading && !error && items.length > 0 ? (
          <View style={styles.list}>
            {items.map((entry) => (
              <RankingRow key={entry.userId} entry={entry} />
            ))}
          </View>
        ) : null}
        {!loading && !error && myRankingLoaded ? (
          <MyRankingCard ranking={myRanking} scope={scope} />
        ) : null}
        {hasMore && !error ? (
          <PrimaryButton
            disabled={loadingMore}
            label={loadingMore ? t('rankingLoading') : t('loadMore')}
            onPress={() => void load(scope, page + 1, true)}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: theme.spacing.sm },
  tab: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: { color: theme.colors.text, fontWeight: '700', textAlign: 'center' },
  tabTextActive: { color: theme.colors.onPrimary },
  loading: { color: theme.colors.mutedText, textAlign: 'center' },
  errorState: { gap: theme.spacing.sm },
  error: { color: theme.colors.error },
  list: { gap: theme.spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  position: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 36,
  },
  avatar: { borderRadius: 22, height: 44, width: 44 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarInitial: { color: theme.colors.text, fontWeight: '800' },
  player: { flex: 1 },
  username: { color: theme.colors.text, fontWeight: '700' },
  country: { color: theme.colors.mutedText, fontSize: 12 },
  score: { alignItems: 'flex-end' },
  scoreValue: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  scoreLabel: { color: theme.colors.mutedText, fontSize: 12 },
  myCard: {
    backgroundColor: '#F7E9D6',
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  myTitle: { color: theme.colors.text, fontWeight: '800' },
  myContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  myScope: { color: theme.colors.mutedText, fontSize: 12 },
  myUnranked: { color: theme.colors.mutedText, lineHeight: 20 },
});
