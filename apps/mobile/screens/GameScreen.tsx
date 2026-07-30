import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { GAME_CORRECT_ANSWERS_PER_LEVEL } from '../constants/app';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { gameSessionService } from '../services/gameSessionService';
import { theme } from '../theme';
import type { AnswerFeedback, GameQuestion, GameSession, GameSummary, Joker } from '../types/game';
import { getCurrentQuestionInLevel } from '../utils/gameProgress';

type FeedbackState = {
  selectedAnswerId?: string;
  feedback: AnswerFeedback;
  next?: { session: GameSession; question: GameQuestion };
  summary?: GameSummary;
  timedOut?: boolean;
};

function ActionCard({ icon, label, detail, disabled, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; detail: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionCard, disabled && styles.cardDisabled, pressed && !disabled && styles.cardPressed]}>
    <MaterialCommunityIcons color={theme.colors.primary} name={icon} size={28} />
    <View style={styles.actionText}><Text style={styles.actionLabel}>{label}</Text><Text style={styles.actionDetail}>{detail}</Text></View>
  </Pressable>;
}

export function GameScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { t } = useLocalization();
  const [session, setSession] = useState<GameSession | null>(null);
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<string | undefined>();
  const [answerFeedback, setAnswerFeedback] = useState<FeedbackState | null>(null);
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptQuestion = useCallback((nextSession: GameSession, nextQuestion: GameQuestion) => {
    setSession(nextSession); setQuestion(nextQuestion); setEliminated([]); setRevealed(undefined); setAnswerFeedback(null);
    setSeconds(Math.max(0, 60 - Math.floor((Date.now() - new Date(nextQuestion.presentedAt).getTime()) / 1000)));
  }, []);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { const started = await gameSessionService.start(); acceptQuestion(started.session, started.question); setJokers(started.jokers); }
    catch { setError(t('gameStartError')); } finally { setBusy(false); }
  }, [acceptQuestion, t]);
  useEffect(() => { void load(); }, [load]);
  const finish = useCallback(async () => {
    if (!session || busy || answerFeedback) return;
    setBusy(true); setError(null);
    try {
      const result = await gameSessionService.finish(session.id);
      setAnswerFeedback({ feedback: result.feedback, summary: result.summary, timedOut: true });
    }
    catch { setError(t('gameActionError')); setBusy(false); }
  }, [answerFeedback, busy, navigation, session, t]);
  useEffect(() => {
    if (!question || busy || answerFeedback) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, 60 - Math.floor((Date.now() - new Date(question.presentedAt).getTime()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) { clearInterval(timer); void finish(); }
    }, 250);
    return () => clearInterval(timer);
  }, [answerFeedback, busy, finish, question]);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (session && !answerFeedback?.summary)
          void gameSessionService.abandon(session.id);
      }),
    [answerFeedback?.summary, navigation, session]
  );
  const action = async (run: () => Promise<void>) => {
    if (busy || answerFeedback) return;
    setBusy(true); setError(null);
    try { await run(); } catch { setError(t('gameActionError')); } finally { setBusy(false); }
  };
  const answer = (answerId: string) => action(async () => {
    if (!session || !question) return;
    const result = await gameSessionService.answer(session.id, question.sessionQuestionId, answerId);
    setAnswerFeedback(result.finished
      ? {
          selectedAnswerId: result.summary.endReason === 'TIMEOUT' ? undefined : answerId,
          feedback: result.feedback,
          summary: result.summary,
          timedOut: result.summary.endReason === 'TIMEOUT',
        }
      : { selectedAnswerId: answerId, feedback: result.feedback, next: { session: result.session, question: result.question } });
  });
  const skip = () => action(async () => {
    if (!session || !question) return;
    const result = await gameSessionService.skip(session.id, question.sessionQuestionId); acceptQuestion(result.session, result.question);
  });
  const useJoker = (code: Joker['code']) => action(async () => {
    if (!session || !question) return;
    const effect = await gameSessionService.useJoker(session.id, question.sessionQuestionId, code);
    setJokers((current) => current.map((item) => item.code === effect.joker.code ? effect.joker : item));
    setEliminated((current) => [...new Set([...current, ...effect.eliminatedOptionIds])]);
    if (effect.revealedOptionId) {
      setRevealed(effect.revealedOptionId);
      const result = await gameSessionService.answer(
        session.id,
        question.sessionQuestionId,
        effect.revealedOptionId
      );
      setAnswerFeedback(result.finished
        ? {
            selectedAnswerId: effect.revealedOptionId,
            feedback: result.feedback,
            summary: result.summary,
            timedOut: result.summary.endReason === 'TIMEOUT',
          }
        : {
            selectedAnswerId: effect.revealedOptionId,
            feedback: result.feedback,
            next: { session: result.session, question: result.question },
          });
    }
  });
  const advance = () => {
    if (!answerFeedback) return;
    if (answerFeedback.summary) navigation.replace('Result', { summary: answerFeedback.summary });
    else if (answerFeedback.next) acceptQuestion(answerFeedback.next.session, answerFeedback.next.question);
  };

  if (!question || !session) return <Screen><EmptyState title={t('gameTitle')} description={error ?? t('gameLoading')} />{error ? <PrimaryButton label={t('tryAgain')} onPress={() => void load()} /> : null}</Screen>;
  const controlsDisabled = busy || Boolean(answerFeedback);
  return <Screen><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.metrics}>
      <View style={styles.metricCard}><MaterialCommunityIcons color={theme.colors.primary} name="stairs" size={22} /><Text style={styles.metricLabel}>{t('level')}</Text><Text style={styles.metricValue}>{session.currentLevel} · {getCurrentQuestionInLevel(session.score)}/{GAME_CORRECT_ANSWERS_PER_LEVEL}</Text></View>
      <View style={styles.metricCard}><MaterialCommunityIcons color={theme.colors.primary} name="star-four-points" size={22} /><Text style={styles.metricLabel}>{t('score')}</Text><Text style={styles.metricValue}>{session.score}</Text></View>
      <View style={[styles.metricCard, answerFeedback?.timedOut && styles.timeExpired]}><MaterialCommunityIcons color={seconds < 15 || answerFeedback?.timedOut ? theme.colors.error : theme.colors.primary} name="timer-outline" size={22} /><Text style={styles.metricLabel}>{t('time')}</Text><Text style={styles.metricValue}>{seconds}s</Text></View>
    </View>
    <Text style={styles.question}>{question.statement}</Text>
    <View style={styles.answers}>{question.answers.map((item) => {
      const isCorrect = answerFeedback?.feedback.correctAnswerOptionId === item.id;
      const isRevealed = revealed === item.id;
      const isSelected = answerFeedback?.selectedAnswerId === item.id;
      const disabled = controlsDisabled || eliminated.includes(item.id);
      return <View key={item.id}><Pressable disabled={disabled} onPress={() => answer(item.id)} style={[styles.answer, eliminated.includes(item.id) && styles.cardDisabled, (isCorrect || isRevealed) && styles.correct, isSelected && !isCorrect && styles.wrong]}><Text style={styles.answerText}>{item.position}. {item.content}</Text>{isCorrect || isRevealed ? <MaterialCommunityIcons color={theme.colors.success} name="check-circle" size={24} /> : null}{isSelected && !isCorrect ? <MaterialCommunityIcons color={theme.colors.error} name="close-circle" size={24} /> : null}</Pressable>{isCorrect && answerFeedback ? <View style={styles.explanation}><Text style={styles.explanationTitle}>{t('answerExplanation')}</Text><Text style={styles.explanationText}>{answerFeedback.feedback.explanation}</Text></View> : null}</View>;
    })}</View>
    {answerFeedback ? <PrimaryButton label={answerFeedback.summary ? t('viewResult') : t('nextQuestion')} onPress={advance} /> : <View style={styles.actions}>
      <ActionCard detail={`${session.skipsRemaining} ${t('available')}`} disabled={controlsDisabled || session.skipsRemaining === 0} icon="run-fast" label={t('skipQuestion')} onPress={skip} />
      {jokers.map((item) => <ActionCard key={item.code} detail={`${item.quantityAvailable} ${t('available')}`} disabled={controlsDisabled || item.quantityAvailable === 0} icon={item.code === 'REVEAL_ANSWER' ? 'account-group-outline' : 'cards-outline'} label={t(item.code === 'REVEAL_ANSWER' ? 'jokerReveal' : 'jokerEliminate')} onPress={() => useJoker(item.code)} />)}
    </View>}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl, paddingTop: theme.spacing.lg },
  metrics: { flexDirection: 'row', gap: theme.spacing.sm }, metricCard: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flex: 1, gap: 3, padding: theme.spacing.sm }, timeExpired: { backgroundColor: '#FCE8E6', borderColor: theme.colors.error }, metricLabel: { color: theme.colors.mutedText, fontSize: 12 }, metricValue: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  question: { color: theme.colors.text, fontSize: 23, fontWeight: '800', lineHeight: 31, marginTop: theme.spacing.sm }, answers: { gap: theme.spacing.sm }, answer: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between', padding: theme.spacing.md }, answerText: { color: theme.colors.text, flex: 1, fontSize: 16 }, correct: { backgroundColor: '#DDF4E5', borderColor: theme.colors.success }, wrong: { backgroundColor: '#FCE8E6', borderColor: theme.colors.error }, explanation: { backgroundColor: '#EDF8F1', borderBottomLeftRadius: theme.radius.md, borderBottomRightRadius: theme.radius.md, marginTop: -theme.spacing.sm, padding: theme.spacing.md, paddingTop: theme.spacing.lg }, explanationTitle: { color: theme.colors.success, fontWeight: '800', marginBottom: 4 }, explanationText: { color: theme.colors.text, lineHeight: 20 },
  actions: { gap: theme.spacing.sm }, actionCard: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md }, actionText: { flex: 1 }, actionLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '700' }, actionDetail: { color: theme.colors.mutedText, fontSize: 13, marginTop: 2 }, cardDisabled: { opacity: 0.45 }, cardPressed: { transform: [{ scale: 0.99 }] }, error: { color: theme.colors.error },
});
