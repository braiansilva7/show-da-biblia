import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useLocalization } from '../context/LocalizationContext';
import type { AppTabParamList } from '../navigation/types';
import { theme } from '../theme';

export function HomeScreen({
  navigation,
}: BottomTabScreenProps<AppTabParamList, 'Home'>) {
  const { t } = useLocalization();
  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>{t('homeTitle')}</Text>
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
});
