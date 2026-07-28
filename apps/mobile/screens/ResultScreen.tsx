import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAppSession } from '../context/AppSessionContext';
import { useLocalization } from '../context/LocalizationContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function ResultScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Result'>) {
  const { t } = useLocalization();
  const { refreshUser } = useAppSession();
  const { summary } = route.params;
  useEffect(() => { void refreshUser(); }, [refreshUser]);
  return <Screen><View style={styles.content}>
    <Text style={styles.title}>{t('resultTitle')}</Text><Text>{t('resultDescription')}</Text>
    <Text style={styles.score}>{summary.score}</Text>
    <Text>{t('correctAnswers')}: {summary.correctAnswers}</Text>
    <Text>{t('answeredQuestions')}: {summary.answeredQuestions}</Text>
    <Text>{t('skipsUsed')}: {summary.skipsUsed}</Text>
    <Text>{t('cardsUsed')}: {summary.jokers.reduce((total, item) => total + item.quantityUsed, 0)}</Text>
    {summary.jokers.map((item) => <Text key={item.code}>{t(item.code === 'REVEAL_ANSWER' ? 'jokerReveal' : 'jokerEliminate')}: {item.quantityUsed}</Text>)}
    <Text>{t('unlockedLevel')}: {summary.highestUnlockedLevel}</Text>
    <PrimaryButton label={t('backHome')} onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })} />
  </View></Screen>;
}
const styles = StyleSheet.create({ content: { flex: 1, gap: theme.spacing.md, justifyContent: 'center' }, title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' }, score: { color: theme.colors.primary, fontSize: 48, fontWeight: '800', textAlign: 'center' } });
